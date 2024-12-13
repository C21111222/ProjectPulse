import Image from '#models/image'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import app from '@adonisjs/core/services/app'
import fs from 'fs'
import env from '#start/env'

export default class ImageService {
  public static async uploadImage(image: MultipartFile, destinationPath: string): Promise<Image> {
    const fileName = `${new Date().getTime()}.${image.extname}`
    await image.move(app.makePath(destinationPath), {
      name: fileName,
    })
    const img = await Image.create({ name: fileName })
    img.url = env.get('APP_URL') + '/img/' + fileName
    await img.save()
    return img
  }

  public static async deleteImage(image: Image): Promise<void> {
    if (image.url) {
      fs.unlinkSync(app.tmpPath('uploads/' + image.url.split('/').pop()))
    } else {
      throw new Error('Image URL is null')
    }
    await image.delete()
  }
}
