export class ValidationError extends Error {
    public code: number;
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
        this.code = 400;
    }
}