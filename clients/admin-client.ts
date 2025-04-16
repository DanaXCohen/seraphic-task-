import axios from 'axios';

export class AdminClient {
    constructor(private serverUrl: string, private authToken: string) {}

    public async updatePolicyFromFile(filePath: string): Promise<boolean> {
        try {
            // Send just the file path to the server
            const response = await axios.put(
                `${this.serverUrl}/policy`,
                { filePath },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    }
                }
            );

            if (response.status === 200) {
                console.log('Policy updated successfully');
                return true;
            } else {
                console.error('Failed to update policy:', response.statusText);
                return false;
            }
        } catch (error) {
            console.error('Error updating policy:', error);
            return false;
        }
    }
}