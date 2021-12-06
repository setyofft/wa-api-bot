const phoneNumberFormatter = function(number) {
    // buang selain nagka
    let formatted = number.replace(/\D/g, '');

    //ganti ke 62
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.substr(1);
    }

    //tambah @c.us
    if (!formatted.endsWith('@c.us')) {
        formatted += '@c.us';
    }

    return formatted;
}

module.exports = {
    phoneNumberFormatter
}