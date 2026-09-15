const previews = new WeakMap();

export function open(dialog, sourceSelector, callback) {
    const previousFocus = document.activeElement;
    const resize = () => {
        const source = document.querySelector(sourceSelector);
        const image = dialog.querySelector('.boon-preview-image');
        if (!source || !image.naturalWidth) return;
        const box = source.getBoundingClientRect();
        const ratio = image.naturalWidth / image.naturalHeight;
        // object-fit: contain means the visible card can be smaller than its slot.
        const width = Math.min(box.width, box.height * ratio);
        const actions = dialog.querySelector('.boon-preview-actions').getBoundingClientRect();
        const note = dialog.querySelector('.boon-preview-note');
        const availableHeight = Math.max(40, dialog.clientHeight - actions.height - (note?.offsetHeight ?? 0) - 64);
        const fittedWidth = Math.min(width * 2, dialog.clientWidth - 32, availableHeight * ratio);
        image.style.width = `${fittedWidth}px`;
        image.style.height = `${fittedWidth / ratio}px`;
    };
    const cancel = event => {
        event.preventDefault();
        callback.invokeMethodAsync('CloseFromKeyboard');
    };
    dialog.addEventListener('cancel', cancel);
    dialog.querySelector('img').addEventListener('load', resize);
    window.addEventListener('resize', resize);
    dialog.showModal();
    resize();
    previews.set(dialog, { resize, cancel, previousFocus });
}

export function dispose(dialog) {
    const state = previews.get(dialog);
    if (!state) return;
    window.removeEventListener('resize', state.resize);
    dialog.removeEventListener('cancel', state.cancel);
    dialog.querySelector('img').removeEventListener('load', state.resize);
    dialog.close();
    if (state.previousFocus?.isConnected) state.previousFocus.focus();
    previews.delete(dialog);
}
