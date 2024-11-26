import type { HttpContext } from '@adonisjs/core/http'
import Image from '#models/image'
import app from '@adonisjs/core/services/app'
import multer from 'multer'
import fs from 'fs'
import User from '#models/user'

export default class ImagesController {
    async upload({auth, request, response } : HttpContext) {
        // Création du dossier de stockage si inexistant
        multer({dest: 'uploads/'})
        const image = request.file('image', {
            size : '2mb',
            extnames: ['jpg', 'png', 'jpeg']
        })
        if (!image) {
            return response.status(400).json({message: 'No file uploaded'})
        }
        let img: Image
        try {
            const fileName = `${new Date().getTime()}.${image.extname}`
            await image.move(app.tmpPath('uploads'), {
                name: fileName
            })
            img  = await Image.create({ name: image.fileName });
            img.url = `http://projectpulse.pautentia.fr/img/${fileName}`
            await img.save()
        } catch (error) {
            return response.status(500).json({message: 'Error uploading file ' + error})
        }
        const user = await User.findOrFail(auth.user.id)
        user.imageUrl = img.url
        await user.save()
        return response.ok("Image uploaded")
    }

    async getImage({params, response}) {
        const image = await Image.findOrFail('name', params.filename)
        return response.json(image)
    }

    async deleteImage({params, response}) {
        const image = await Image.findByOrFail('name', params.filename)
        if (image.url) {
            fs.unlinkSync(app.tmpPath('uploads/' + image.url.split('/').pop()))
        } else {
            return response.status(400).json({message: 'Image URL is null'})
        }
        await image.delete()
        return response.ok("Image deleted")
    }




}