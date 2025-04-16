export class PolicyVersionError extends Error {
    public code: number;

    constructor(message: string) {
        super(message);
        this.name = 'PolicyVersionError';
        this.code = 400;
    }
}