
export const fileFilter = (req: Express.Request, file: Express.Multer.File, callback: Function ) => {

    
    if ( !file) return callback( new Error('File is empty'), false);

    const fileExptension = file.originalname.split('.')[1];

    const validExensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

    if ( validExensions.includes(fileExptension) ) {
        return callback(null, true);
    }

    return callback(null, false);
}