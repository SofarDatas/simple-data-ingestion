import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as s3 from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';

const s3Client = new s3.S3Client({ });
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;

/**
 * Handles the generation of a presigned URL for uploading a PDF file to S3.
 *
 * @param {APIGatewayProxyEvent} event - The event object from API Gateway.
 * @returns {Promise<APIGatewayProxyResult>} - Returns a response object containing the presigned URL or an error message.
 * @throws {Error} - Throws an error if S3_BUCKET_NAME is not defined or if there is an issue generating the presigned URL.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const correlationId = uuidv4();
    const method = 'data-ingestion.handler';
    const prefix = `${correlationId} - ${method}`;
    console.log(`${prefix} - started.`);

    if (!S3_BUCKET_NAME) {
        console.error(`${prefix} - S3_BUCKET_NAME is undefined.`);
        return {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            body: JSON.stringify({ message: 'Internal server error, missing S3_BUCKET_NAME.' }),
        };
    }

    // prepare parameters for generating presigned URL
    const params = {
        Bucket: S3_BUCKET_NAME,
        Key: `${correlationId}/upload.pdf`,
        ContentType: 'application/pdf'
    };

    try {
        const command = new GetObjectCommand(params);
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 }); // this link will expire in 60 seconds
        console.log(`${prefix} - Presigned URL generated.`);
        return {
            statusCode: StatusCodes.OK,
            body: JSON.stringify({ signedUrl: signedUrl }),
        };
    } catch (error) {
        console.error(`${prefix} - Error generating presigned URL: ${error}`);
        return {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            body: JSON.stringify({ message: 'Could not generate presigned URL.' }),
        };
    }
}
