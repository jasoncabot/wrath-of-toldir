
export default class ChatDialog {
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin;
    onMessage: (message: string) => void;

    constructor(scene: Phaser.Scene, onMessage: (message: string) => void) {
        this.keyboard = scene.input.keyboard;
        this.onMessage = onMessage;

        document.addEventListener('submit-chat-dialog', this.onSubmitHandler.bind(this));
        document.addEventListener('hide-chat-dialog', this.hideInputDialog.bind(this));
    }

    private onSubmitHandler(event: Event) {
        this.hideInputDialog();

        const chatEvent = event as CustomEvent<{ message: string }>;
        const message = chatEvent.detail.message;
        if (message && message.length > 0) {
            this.onMessage(message);
        }
    }

    hideInputDialog() {
        this.keyboard.enabled = true;
        this.keyboard.enableGlobalCapture();
    }

    showInputDialog() {
        this.keyboard.enabled = false;
        this.keyboard.disableGlobalCapture();

        document.dispatchEvent(new CustomEvent('show-chat-dialog'));
    }
}
