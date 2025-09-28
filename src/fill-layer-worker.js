// aguaceroAPI/src/fill-layer-worker.js

import { decompress } from 'fzstd';

// Listen for messages from the main thread
self.onmessage = async (e) => {
    const { compressedData, encoding } = e.data;

    try {
        // Perform the heavy decompression work
        const decompressedData = decompress(compressedData);

        // Send the successful result back to the main thread
        self.postMessage({
            success: true,
            decompressedData,
            encoding
        }, [decompressedData.buffer]); // Transfer the buffer for performance

    } catch (error) {
        // If something goes wrong, send an error message back
        self.postMessage({
            success: false,
            error: error.message
        });
    }
};