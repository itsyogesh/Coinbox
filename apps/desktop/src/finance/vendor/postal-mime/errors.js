// The error class each code is thrown as. An invalid option or input is a TypeError, as an
// invalid option was before codes were added
const ERROR_TYPES = {
    EINVALIDOPTION: TypeError,
    EINVALIDINPUT: TypeError,
    EPARSERREUSED: Error,
    EMAXNESTINGDEPTH: Error,
    EMAXHEADERSIZE: Error,
    EMAXPARTCOUNT: Error,
    EMAXFORWARDEDADDRESSES: Error
};
/**
 * Creates an error with a code
 *
 * @param code Error code
 * @param message Error message
 * @returns The error
 */
export function createError(code, message) {
    const error = new ERROR_TYPES[code](message);
    error.code = code;
    return error;
}
