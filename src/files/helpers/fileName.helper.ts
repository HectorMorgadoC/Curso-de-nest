
import { v4 as uuid } from 'uuid'

export const fileName = (req: Express.Request, file: Express.Multer.File, callback: Function ) => {

    
    if ( !file) return callback( new Error('File is empty'), false);

    const fileExtension = file.originalname.split('.')[1];
    const fileName = `${uuid()}.${fileExtension}`;
    return callback(null, fileName);
}