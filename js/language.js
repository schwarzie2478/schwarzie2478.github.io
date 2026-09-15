export function load() {
    let code = 'nl';
    try { if (localStorage.getItem('treasure-hunter-language') === 'en') code = 'en'; } catch { }
    apply(code);
    return code;
}
function apply(code) {
    document.documentElement.lang = code;
    document.querySelector('#blazor-error-ui .error-text').textContent = code === 'nl'
        ? 'Er is een onverwachte fout opgetreden.' : 'An unexpected error has occurred.';
    document.querySelector('#blazor-error-ui .reload').textContent = code === 'nl' ? 'Opnieuw laden' : 'Reload';
}
export function save(code) {
    apply(code);
    try { localStorage.setItem('treasure-hunter-language', code); } catch { }
}
