export class InfraError extends Error {
    public code: number
    constructor(message: string) {
        super(message);
        this.name = 'InfraError';
        this.code = 500;
    }
}