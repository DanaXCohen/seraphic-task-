export class LockError extends Error {
    public code: number
    constructor(message: string) {
        super(message);
        this.name = 'LockError';
        this.code = 409;
    }
} 