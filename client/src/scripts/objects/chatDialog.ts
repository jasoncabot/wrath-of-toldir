
/**
 * Bi-directional communication between React and Phaser components through events
 */
export default class ChatDialog {
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin;
    onMessage: (message: string) => void;

    constructor(scene: Phaser.Scene, onMessage: (message: string) => void) {
        this.keyboard = scene.input.keyboard;
        this.onMessage = onMessage;

        document.addEventListener('submit-chat-dialog', this.onSubmitHandler.bind(this));
        document.addEventListener('chat-dialog-blurred', this.onChatBlurred.bind(this));
        document.addEventListener('chat-dialog-focused', this.onChatFocused.bind(this));
    }

    private onSubmitHandler(event: Event) {
        const chatEvent = event as CustomEvent<{ message: string }>;
        const message = chatEvent.detail.message;
        if (message && message.length > 0) {
            this.onMessage(message);
        }
    }

    private onChatBlurred() {
        this.keyboard.enabled = true;
        this.keyboard.enableGlobalCapture();
    }

    private onChatFocused() {
        this.keyboard.enabled = false;
        this.keyboard.disableGlobalCapture();
    }

    focus() {
        document.dispatchEvent(new CustomEvent('focus-chat-dialog'));
    }

    blur() {
        document.dispatchEvent(new CustomEvent('blur-chat-dialog'));
    }
}
