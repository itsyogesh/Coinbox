use coinbox_finance::{
    inspect_csv, Confirmation, CsvMapping, PostChoice, Statement, TransferChoice, Vault,
};
use serde_json::json;
use tempfile::tempdir;

const BANK: &[u8] =
    include_bytes!("../../../apps/desktop/src/finance/fixtures/synthetic-bank-inr.csv");
const CARD: &[u8] =
    include_bytes!("../../../apps/desktop/src/finance/fixtures/synthetic-card-inr.csv");
const KEY: &str = "offline synthetic finance fixture passphrase";

fn statement(id: i64, name: &str, bytes: &[u8], card: bool) -> Statement {
    let (amount, balance) = if card {
        (json!({"type":"signed", "column":2, "invert":false}), 3)
    } else {
        (json!({"type":"split", "debit":2, "credit":3}), 4)
    };
    Statement {
        account_id: id,
        name: name.into(),
        bytes: bytes.to_vec(),
        mapping: serde_json::from_value(json!({
            "date":0, "description":1, "dateFormat":"iso", "amount":amount, "balance":balance,
            "balanceIsOwed":card, "newestFirst":false,
        }))
        .unwrap(),
    }
}

fn post(id: i64) -> PostChoice {
    PostChoice {
        row_id: id,
        acknowledge_warning: false,
    }
}

#[test]
fn offline_repayment_import_retry_export_and_restore() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("vault.sqlite3");
    let mut vault = Vault::create(&path, KEY).unwrap();
    let bank = vault.add_account("personal", "Checking", "bank").unwrap();
    let card = vault.add_account("personal", "Card", "card").unwrap();
    let business = vault
        .add_account("droidsize", "Business checking", "bank")
        .unwrap();
    let bank_statement = statement(bank, "bank.csv", BANK, false);
    let card_statement = statement(card, "card.csv", CARD, true);
    let bank_source = vault.stage("personal", &bank_statement).unwrap().source_id;
    let card_source = vault.stage("personal", &card_statement).unwrap().source_id;
    let review = vault.review("personal").unwrap();
    assert_eq!(review.sources.len(), 2);
    assert!(review
        .sources
        .iter()
        .all(|source| source.pending == 2 && source.balances == 2 && source.mismatches == 0));
    let salary = review
        .rows
        .iter()
        .find(|row| row.row.description == "Sample salary")
        .unwrap()
        .row
        .source
        .row_id;
    let purchase = review
        .rows
        .iter()
        .find(|row| row.row.description == "Sample bookshop")
        .unwrap()
        .row
        .source
        .row_id;
    let bank_payment = review
        .rows
        .iter()
        .find(|row| row.row.source.source_id == bank_source && row.transfer_hint)
        .unwrap();
    assert_eq!(bank_payment.transfer_matches.len(), 1);
    let card_payment = bank_payment.transfer_matches[0].row_id;
    assert_eq!(bank_payment.transfer_matches[0].source_id, card_source);
    assert_eq!(vault.report("personal").unwrap().spending, "0");

    let wrong = Confirmation {
        request_id: "wrong".into(),
        post: vec![post(salary), post(bank_payment.row.source.row_id)],
        skip: vec![],
        transfers: vec![],
    };
    assert!(vault.confirm("personal", &wrong).is_err());
    assert!(vault.report("personal").unwrap().entries.is_empty());
    let choice = Confirmation {
        request_id: "confirm-1".into(),
        post: vec![post(salary), post(purchase)],
        skip: vec![],
        transfers: vec![TransferChoice {
            bank_row_id: bank_payment.row.source.row_id,
            card_row_id: card_payment,
        }],
    };
    assert!(vault.confirm("droidsize", &choice).is_err());
    assert_eq!(vault.confirm("personal", &choice).unwrap().posted, 3);
    assert_eq!(vault.confirm("personal", &choice).unwrap().posted, 3);
    let mut renamed = bank_statement;
    renamed.name = "same-bytes-renamed.csv".into();
    assert!(vault.stage("personal", &renamed).unwrap().already_exists);
    assert!(
        vault
            .stage("personal", &card_statement)
            .unwrap()
            .already_exists
    );
    assert_eq!(vault.review("personal").unwrap().rows.len(), 0);
    let report = vault.report("personal").unwrap();
    assert_eq!(
        (
            report.spending.as_str(),
            report.income.as_str(),
            report.entries.len()
        ),
        ("100000", "500000", 3)
    );
    assert_eq!(
        report
            .accounts
            .iter()
            .map(|a| a.movement.as_str())
            .collect::<Vec<_>>(),
        ["400000", "0"]
    );
    assert_eq!(report.entries[0].sources.len(), 2);
    assert_eq!(report.entries[0].spending, "0");
    assert_eq!(
        vault.source_row("personal", card_payment).unwrap().raw,
        "2026-09-07,Payment received,1000.00,0.00"
    );
    assert!(vault.source_row("droidsize", card_payment).is_err());
    assert!(vault.source_file("droidsize", card_source).is_err());
    assert!(vault.discard("personal", card_source).is_err());
    assert!(vault.stage("droidsize", &renamed).is_err());
    assert!(
        !vault
            .stage(
                "droidsize",
                &statement(business, "business.csv", BANK, false)
            )
            .unwrap()
            .already_exists
    );
    assert_eq!(vault.review("droidsize").unwrap().sources.len(), 1);
    let business_salary = vault
        .review("droidsize")
        .unwrap()
        .rows
        .into_iter()
        .find(|row| row.row.description == "Sample salary")
        .unwrap()
        .row
        .source
        .row_id;
    assert_eq!(
        vault
            .confirm(
                "droidsize",
                &Confirmation {
                    request_id: "confirm-1".into(),
                    post: vec![post(business_salary)],
                    skip: vec![],
                    transfers: vec![]
                }
            )
            .unwrap()
            .posted,
        1
    );
    assert_eq!(vault.report("droidsize").unwrap().income, "500000");
    assert_eq!(vault.report("droidsize").unwrap().spending, "0");
    assert!(!vault.export_csv("droidsize").unwrap().contains("bookshop"));
    let csv = vault.export_csv("personal").unwrap();
    assert!(csv.contains("\"expense\",\"-1000.00\",\"1000.00\",\"0.00\""));
    assert!(csv.contains("bank.csv line 3") && csv.contains("card.csv line 3"));
    assert_eq!(csv.lines().count(), 4);
    let backup = vault.backup().unwrap();
    assert!(!backup.starts_with(b"SQLite format 3\0"));
    assert!(!backup
        .windows(b"Sample bookshop".len())
        .any(|window| window == b"Sample bookshop"));
    let restored_path = dir.path().join("restored.sqlite3");
    assert!(Vault::restore(&restored_path, "wrong passphrase", &backup).is_err());
    assert!(!restored_path.exists());
    let restored = Vault::restore(&restored_path, KEY, &backup).unwrap();
    assert_eq!(restored.export_csv("personal").unwrap(), csv);
    assert_eq!(restored.source_file("personal", card_source).unwrap(), CARD);
    assert_eq!(
        restored.source_row("personal", card_payment).unwrap().raw,
        vault.source_row("personal", card_payment).unwrap().raw
    );
    assert!(Vault::restore(&path, KEY, &backup).is_err());
    assert!(Vault::open(&path, "wrong passphrase").is_err());
    assert!(Vault::open(&dir.path().join("missing.sqlite3"), KEY).is_err());
    assert_eq!(
        Vault::open(&path, KEY)
            .unwrap()
            .report("personal")
            .unwrap()
            .spending,
        "100000"
    );
}

#[test]
fn quoted_rows_exact_money_and_overlaps_need_distinct_decisions() {
    let dir = tempdir().unwrap();
    let mut vault = Vault::create(&dir.path().join("vault.sqlite3"), KEY).unwrap();
    let bank = vault.add_account("personal", "Checking", "bank").unwrap();
    let csv = "\u{feff}Date,Description,Amount,Balance\r\n02/09/2026,\"Cafe, \"\"Downtown\"\"\r\nTerminal\",-0.01,\"1,23,456.78\"\r\n02/09/2026,\"Cafe, \"\"Downtown\"\"\r\nTerminal\",-0.01,\"1,23,456.77\"\r\n03/09/2026,\"=2+2\",-0.10,\"1,23,456.66\"\r\n31/02/2026,Invalid,3,\r\n";
    let preview = serde_json::to_value(inspect_csv(csv.as_bytes()).unwrap()).unwrap();
    assert_eq!(preview["rows"], 4);
    let mapping = || -> CsvMapping {
        serde_json::from_value(json!({ "date":0, "description":1, "dateFormat":"day_first",
        "amount":{"type":"signed", "column":2, "invert":false}, "balance":3, "balanceIsOwed":false, "newestFirst":false })).unwrap()
    };
    vault
        .stage(
            "personal",
            &Statement {
                account_id: bank,
                name: "first.csv".into(),
                bytes: csv.as_bytes().to_vec(),
                mapping: mapping(),
            },
        )
        .unwrap();
    let review = vault.review("personal").unwrap();
    assert_eq!(
        review
            .rows
            .iter()
            .map(|row| row.row.source.line)
            .collect::<Vec<_>>(),
        [2, 4, 6, 7]
    );
    assert!(review.rows[0].duplicate.is_none() && review.rows[1].duplicate.is_none());
    assert!(review.rows[2].row.balance_mismatch);
    assert_eq!(review.rows[3].row.status, "invalid");
    let choice = Confirmation {
        request_id: "first".into(),
        post: vec![
            post(review.rows[0].row.source.row_id),
            post(review.rows[1].row.source.row_id),
            PostChoice {
                row_id: review.rows[2].row.source.row_id,
                acknowledge_warning: true,
            },
        ],
        skip: vec![],
        transfers: vec![],
    };
    assert_eq!(vault.confirm("personal", &choice).unwrap().posted, 3);
    assert_eq!(vault.report("personal").unwrap().spending, "12");
    assert!(vault.export_csv("personal").unwrap().contains("\"'=2+2\""));
    let overlap = "Date,Description,Amount,Balance\n02/09/2026,\"Cafe, \"\"Downtown\"\"\nTerminal\",-0.01,\"1,23,456.77\"\n";
    vault
        .stage(
            "personal",
            &Statement {
                account_id: bank,
                name: "overlap.csv".into(),
                bytes: overlap.as_bytes().to_vec(),
                mapping: mapping(),
            },
        )
        .unwrap();
    let review = vault.review("personal").unwrap();
    let overlapping = review
        .rows
        .iter()
        .find(|row| row.row.source.name == "overlap.csv")
        .unwrap();
    assert_eq!(overlapping.duplicate.as_ref().unwrap().name, "first.csv");
    let id = overlapping.row.source.row_id;
    let mut choice = Confirmation {
        request_id: "overlap".into(),
        post: vec![post(id)],
        skip: vec![],
        transfers: vec![],
    };
    assert!(vault.confirm("personal", &choice).is_err());
    choice.post.clear();
    choice.skip.push(id);
    assert_eq!(vault.confirm("personal", &choice).unwrap().skipped, 1);
    assert_eq!(vault.report("personal").unwrap().spending, "12");
}
