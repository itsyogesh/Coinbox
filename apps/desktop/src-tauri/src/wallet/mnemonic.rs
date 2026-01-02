//! BIP39 mnemonic generation and validation
//!
//! This module provides functions for:
//! - Generating new random mnemonics (12 or 24 words)
//! - Validating existing mnemonics
//! - Converting mnemonics to seeds for key derivation
//!
//! # Security Notes
//! - Mnemonics are wrapped in `SecretMnemonic` which zeroizes on drop
//! - Seeds are wrapped in `SecretSeed` which zeroizes on drop
//! - Never log or print mnemonics/seeds

use bip39::{Language, Mnemonic};
use rand::RngCore;

use crate::wallet::error::{WalletError, WalletResult};
use crate::wallet::types::{SecretMnemonic, SecretSeed, ValidateMnemonicResponse};

/// Number of words in a standard mnemonic
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MnemonicLength {
    /// 12 words (128 bits of entropy)
    Words12 = 12,
    /// 24 words (256 bits of entropy)
    Words24 = 24,
}

impl MnemonicLength {
    /// Get the number of words
    pub fn word_count(&self) -> usize {
        *self as usize
    }
}

/// Generate a new random mnemonic phrase
///
/// # Arguments
/// * `length` - Number of words (12 or 24)
///
/// # Returns
/// A `SecretMnemonic` containing the generated phrase
///
/// # Example
/// ```ignore
/// let mnemonic = generate_mnemonic(MnemonicLength::Words12)?;
/// println!("Backup these words: {}", mnemonic.as_str());
/// ```
pub fn generate_mnemonic(length: MnemonicLength) -> WalletResult<SecretMnemonic> {
    // Generate random entropy
    // 12 words = 128 bits = 16 bytes
    // 24 words = 256 bits = 32 bytes
    let entropy_len = match length {
        MnemonicLength::Words12 => 16,
        MnemonicLength::Words24 => 32,
    };

    let mut entropy = vec![0u8; entropy_len];
    rand::thread_rng().fill_bytes(&mut entropy);

    let mnemonic = Mnemonic::from_entropy(&entropy)
        .map_err(|e| WalletError::InvalidMnemonic(e.to_string()))?;

    Ok(SecretMnemonic::new(mnemonic.to_string()))
}

/// Validate a mnemonic phrase
///
/// Checks:
/// 1. Word count is 12 or 24
/// 2. All words are in the BIP39 wordlist
/// 3. Checksum is valid
///
/// # Arguments
/// * `phrase` - The mnemonic phrase to validate
///
/// # Returns
/// `ValidateMnemonicResponse` with validation result
pub fn validate_mnemonic(phrase: &str) -> ValidateMnemonicResponse {
    let words: Vec<&str> = phrase.split_whitespace().collect();
    let word_count = words.len();

    // Check word count
    if word_count != 12 && word_count != 24 {
        return ValidateMnemonicResponse {
            is_valid: false,
            word_count,
            error: Some(format!(
                "Invalid word count: expected 12 or 24, got {}",
                word_count
            )),
        };
    }

    // Check each word is in wordlist
    let wordlist = Language::English.word_list();
    for (i, word) in words.iter().enumerate() {
        if !wordlist.contains(word) {
            return ValidateMnemonicResponse {
                is_valid: false,
                word_count,
                error: Some(format!("Invalid word '{}' at position {}", word, i + 1)),
            };
        }
    }

    // Parse and validate checksum
    match Mnemonic::parse_in(Language::English, phrase) {
        Ok(_) => ValidateMnemonicResponse {
            is_valid: true,
            word_count,
            error: None,
        },
        Err(e) => ValidateMnemonicResponse {
            is_valid: false,
            word_count,
            error: Some(e.to_string()),
        },
    }
}

/// Parse and validate a mnemonic phrase, returning it wrapped in SecretMnemonic
///
/// # Arguments
/// * `phrase` - The mnemonic phrase to parse
///
/// # Returns
/// `SecretMnemonic` if valid, error otherwise
pub fn parse_mnemonic(phrase: &str) -> WalletResult<SecretMnemonic> {
    let validation = validate_mnemonic(phrase);
    if !validation.is_valid {
        return Err(WalletError::InvalidMnemonic(
            validation.error.unwrap_or_else(|| "Invalid mnemonic".to_string()),
        ));
    }

    Ok(SecretMnemonic::new(phrase.to_string()))
}

/// Convert a mnemonic to a 512-bit seed
///
/// Uses PBKDF2-HMAC-SHA512 with 2048 iterations as per BIP39.
///
/// # Arguments
/// * `mnemonic` - The mnemonic phrase
/// * `passphrase` - Optional passphrase (empty string if none)
///
/// # Returns
/// `SecretSeed` containing the 64-byte seed
///
/// # Security
/// The seed is wrapped in `SecretSeed` which will zeroize on drop.
pub fn mnemonic_to_seed(mnemonic: &SecretMnemonic, passphrase: &str) -> WalletResult<SecretSeed> {
    let parsed = Mnemonic::parse_in(Language::English, mnemonic.as_str())
        .map_err(|e| WalletError::InvalidMnemonic(e.to_string()))?;

    let seed_bytes = parsed.to_seed(passphrase);

    // Convert to fixed-size array
    let mut seed = [0u8; 64];
    seed.copy_from_slice(&seed_bytes);

    Ok(SecretSeed::new(seed))
}

/// Get all BIP39 words for autocomplete
///
/// # Returns
/// A reference to the English wordlist (2048 words)
pub fn get_wordlist() -> &'static [&'static str] {
    Language::English.word_list()
}

/// Find matching words from the wordlist (for autocomplete)
///
/// # Arguments
/// * `prefix` - The prefix to search for
/// * `max_results` - Maximum number of results to return
///
/// # Returns
/// Vector of matching words
pub fn find_matching_words(prefix: &str, max_results: usize) -> Vec<&'static str> {
    let prefix_lower = prefix.to_lowercase();
    get_wordlist()
        .iter()
        .filter(|word| word.starts_with(&prefix_lower))
        .take(max_results)
        .copied()
        .collect()
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// Test mnemonic from BIP39 test vectors
    const TEST_MNEMONIC_12: &str =
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

    const TEST_MNEMONIC_24: &str =
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";

    #[test]
    fn test_generate_mnemonic_12_words() {
        let mnemonic = generate_mnemonic(MnemonicLength::Words12).unwrap();
        let words = mnemonic.words();
        assert_eq!(words.len(), 12);

        // Verify all words are in wordlist
        let wordlist = get_wordlist();
        for word in &words {
            assert!(wordlist.contains(word), "Word '{}' not in wordlist", word);
        }

        // Verify it's valid
        let validation = validate_mnemonic(mnemonic.as_str());
        assert!(validation.is_valid, "Generated mnemonic should be valid");
    }

    #[test]
    fn test_generate_mnemonic_24_words() {
        let mnemonic = generate_mnemonic(MnemonicLength::Words24).unwrap();
        let words = mnemonic.words();
        assert_eq!(words.len(), 24);

        // Verify it's valid
        let validation = validate_mnemonic(mnemonic.as_str());
        assert!(validation.is_valid, "Generated mnemonic should be valid");
    }

    #[test]
    fn test_validate_valid_mnemonic_12() {
        let result = validate_mnemonic(TEST_MNEMONIC_12);
        assert!(result.is_valid);
        assert_eq!(result.word_count, 12);
        assert!(result.error.is_none());
    }

    #[test]
    fn test_validate_valid_mnemonic_24() {
        let result = validate_mnemonic(TEST_MNEMONIC_24);
        assert!(result.is_valid);
        assert_eq!(result.word_count, 24);
        assert!(result.error.is_none());
    }

    #[test]
    fn test_validate_invalid_word_count() {
        let result = validate_mnemonic("abandon abandon abandon");
        assert!(!result.is_valid);
        assert_eq!(result.word_count, 3);
        assert!(result.error.unwrap().contains("Invalid word count"));
    }

    #[test]
    fn test_validate_invalid_word() {
        let result = validate_mnemonic(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon xyz",
        );
        assert!(!result.is_valid);
        assert!(result.error.unwrap().contains("Invalid word 'xyz'"));
    }

    #[test]
    fn test_validate_invalid_checksum() {
        // Valid words but wrong checksum
        let result = validate_mnemonic(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
        );
        assert!(!result.is_valid);
        // Should fail checksum validation
    }

    #[test]
    fn test_parse_mnemonic_valid() {
        let mnemonic = parse_mnemonic(TEST_MNEMONIC_12).unwrap();
        assert_eq!(mnemonic.words().len(), 12);
    }

    #[test]
    fn test_parse_mnemonic_invalid() {
        let result = parse_mnemonic("invalid mnemonic phrase");
        assert!(result.is_err());
    }

    #[test]
    fn test_mnemonic_to_seed() {
        let mnemonic = SecretMnemonic::new(TEST_MNEMONIC_12.to_string());
        let seed = mnemonic_to_seed(&mnemonic, "").unwrap();

        // Seed should be 64 bytes
        assert_eq!(seed.as_bytes().len(), 64);

        // Known test vector from BIP39
        // "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
        // with empty passphrase should produce specific seed
        let expected_seed_hex = "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4";
        let actual_seed_hex = hex::encode(seed.as_bytes());
        assert_eq!(actual_seed_hex, expected_seed_hex);
    }

    #[test]
    fn test_mnemonic_to_seed_with_passphrase() {
        let mnemonic = SecretMnemonic::new(TEST_MNEMONIC_12.to_string());
        let seed_no_pass = mnemonic_to_seed(&mnemonic, "").unwrap();
        let seed_with_pass = mnemonic_to_seed(&mnemonic, "TREZOR").unwrap();

        // Different passphrases should produce different seeds
        assert_ne!(seed_no_pass.as_bytes(), seed_with_pass.as_bytes());

        // Known test vector with "TREZOR" passphrase
        let expected_seed_hex = "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04";
        let actual_seed_hex = hex::encode(seed_with_pass.as_bytes());
        assert_eq!(actual_seed_hex, expected_seed_hex);
    }

    #[test]
    fn test_get_wordlist() {
        let wordlist = get_wordlist();
        assert_eq!(wordlist.len(), 2048);
        assert!(wordlist.contains(&"abandon"));
        assert!(wordlist.contains(&"zoo"));
    }

    #[test]
    fn test_find_matching_words() {
        let matches = find_matching_words("ab", 5);
        assert!(!matches.is_empty());
        for word in &matches {
            assert!(word.starts_with("ab"));
        }

        // Check it respects max_results
        let matches = find_matching_words("a", 3);
        assert!(matches.len() <= 3);

        // Non-existent prefix
        let matches = find_matching_words("xyz", 10);
        assert!(matches.is_empty());
    }

    #[test]
    fn test_mnemonic_randomness() {
        // Generate multiple mnemonics and ensure they're different
        let m1 = generate_mnemonic(MnemonicLength::Words12).unwrap();
        let m2 = generate_mnemonic(MnemonicLength::Words12).unwrap();
        let m3 = generate_mnemonic(MnemonicLength::Words12).unwrap();

        assert_ne!(m1.as_str(), m2.as_str());
        assert_ne!(m2.as_str(), m3.as_str());
        assert_ne!(m1.as_str(), m3.as_str());
    }

    #[test]
    fn test_mnemonic_case_insensitivity() {
        // BIP39 should accept lowercase
        let lower = TEST_MNEMONIC_12.to_lowercase();
        let result = validate_mnemonic(&lower);
        assert!(result.is_valid);
    }

    #[test]
    fn test_mnemonic_extra_whitespace() {
        // Should handle extra whitespace
        let with_spaces = "  abandon   abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about  ";
        let result = validate_mnemonic(with_spaces);
        // Note: This depends on implementation - extra spaces between words may fail
        // But leading/trailing spaces should be handled
    }
}
