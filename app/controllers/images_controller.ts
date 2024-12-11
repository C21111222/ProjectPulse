import type { HttpContext } from '@adonisjs/core/http'
import Image from '#models/image'
import Team from '#models/team'
import app from '@adonisjs/core/services/app'
import multer from 'multer'
import fs from 'fs'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'

export default class ImagesController {
  async uploadTeam({ auth, request, response }: HttpContext) {
    multer({ dest: 'uploads/' })
    const teamId = request.input('team_id')
    const team = await Team.findOrFail(teamId)
    // on vérifie que l'utilisateur est bien admin de l'équipe
    const user = await User.findOrFail(auth.user.id)
    const role = await db
      .from('user_teams')
      .where('team_id', teamId)
      .where('user_id', user.id)
      .select('role')
      .first()
    if (!role || role.role !== 'admin') {
      return response.status(403).json({ message: 'You are not allowed to do this' })
    }
    const image = request.file('image', {
      size: '2mb',
      extnames: ['jpg', 'png', 'jpeg'],
    })
    if (!image) {
      return response.status(400).json({ message: 'No file uploaded' })
    }
    logger.info('Image uploaded : %s', image.extname)
    let img: Image
    try {
      const fileName = `${new Date().getTime()}.${image.extname}`
      await image.move(app.makePath('/app/uploads'), {
        name: fileName,
      })
      img = await Image.create({ name: fileName })
      img.url = `http://projectpulse.pautentia.fr/img/${fileName}`
      await img.save()
    } catch (error) {
      logger.error('Error uploading file %s', error)
      return response.status(500).json({ message: 'Error uploading file ' + error })
    }
    team.imageUrl = img.url
    await team.save()
    return response.ok('Image uploaded')
  }

  async upload({ auth, request, response }: HttpContext) {
    // Création du dossier de stockage si inexistant
    multer({ dest: 'uploads/' })
    logger.info('Uploading image')
    logger.info('User id : %s', auth.user.id)
    const image = request.file('image', {
      size: '2mb',
      extnames: ['jpg', 'png', 'jpeg'],
    })
    if (!image) {
      return response.status(400).json({ message: 'No file uploaded' })
    }
    logger.info('Image uploaded : %s', image.extname)
    let img: Image
    try {
      const fileName = `${new Date().getTime()}.${image.extname}`
      await image.move(app.makePath('/app/uploads'), {
        name: fileName,
      })
      img = await Image.create({ name: fileName })
      img.url = `http://projectpulse.pautentia.fr/img/${fileName}`
      await img.save()
    } catch (error) {
      logger.error('Error uploading file %s', error)
      return response.status(500).json({ message: 'Error uploading file ' + error })
    }
    const user = await User.findOrFail(auth.user.id)
    user.imageUrl = img.url
    await user.save()
    return response.ok('Image uploaded')
  }

  async getImage({ params, response }) {
    const image = await Image.findOrFail('name', params.filename)
    return response.json(image)
  }

  async deleteImage({ params, response }) {
    const image = await Image.findByOrFail('name', params.filename)
    if (image.url) {
      fs.unlinkSync(app.tmpPath('uploads/' + image.url.split('/').pop()))
    } else {
      return response.status(400).json({ message: 'Image URL is null' })
    }
    await image.delete()
    return response.ok('Image deleted')
  }
}
