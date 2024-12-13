import type { HttpContext } from '@adonisjs/core/http'
import Image from '#models/image'
import Team from '#models/team'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import ImageService from '#services/image_service'
import TeamService from '#services/team_service'

export default class ImagesController {
  /**
   * Uploads an image for a team.
   * 
   * @param {HttpContext} context - The HTTP context containing auth, request, and response objects.
   * @returns {Promise<void>} - A promise that resolves to void.
   * 
   * @throws {Error} - Throws an error if the user is not authenticated or authorized, 
   *                   if no file is uploaded, or if there is an error during the upload process.
   * 
   * @remarks
   * - The user must be authenticated and an admin of the team to upload an image.
   * - The image file must be of type 'jpg', 'png', or 'jpeg' and not exceed 2MB in size.
   * - Logs the image extension and any errors encountered during the upload process.
   * 
   * @example
   * // Example usage:
   * const context = { auth, request, response };
   * await uploadTeam(context);
   */
  async uploadTeam({ auth, request, response }: HttpContext) {
    const teamId = request.input('team_id')
    const team = await Team.findOrFail(teamId)
    if (!auth.user || !auth.user.id) {
      return response.status(401).json({ message: 'Unauthorized' })
    }
    const user = await User.findOrFail(auth.user.id)

    if (!(await TeamService.isUserAdminOfTeam(user.id, teamId))) {
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
    try {
      const img = await ImageService.uploadImage(image, '/app/uploads')
      team.imageUrl = img.url || ''
      await team.save()
      return response.ok('Image uploaded')
    } catch (error) {
      logger.error('Error uploading file %s', error)
      return response.status(500).json({ message: 'Error uploading file ' + error })
    }
  }

  /**
   * Handles the image upload process.
   * 
   * @param {HttpContext} context - The HTTP context containing auth, request, and response objects.
   * @returns {Promise<void>} - A promise that resolves to void.
   * 
   * @throws {Error} - Throws an error if the upload process fails.
   * 
   * The function performs the following steps:
   * 1. Checks if the user is authenticated. If not, returns a 401 Unauthorized response.
   * 2. Validates the uploaded file to ensure it is an image with a size limit of 2MB and allowed extensions (jpg, png, jpeg).
   * 3. Logs the image extension.
   * 4. Attempts to upload the image using the ImageService and updates the user's imageUrl.
   * 5. Returns a success response if the upload is successful.
   * 6. Catches and logs any errors during the upload process and returns a 500 Internal Server Error response.
   */
  async upload({ auth, request, response }: HttpContext) {
    if (!auth.user || !auth.user.id) {
      return response.status(401).json({ message: 'Unauthorized' })
    }

    const image = request.file('image', {
      size: '2mb',
      extnames: ['jpg', 'png', 'jpeg'],
    })
    if (!image) {
      return response.status(400).json({ message: 'No file uploaded' })
    }

    logger.info('Image uploaded : %s', image.extname)
    try {
      const img = await ImageService.uploadImage(image, '/app/uploads')
      const user = await User.findOrFail(auth.user.id)
      user.imageUrl = img.url || ''
      await user.save()
      return response.ok('Image uploaded')
    } catch (error) {
      logger.error('Error uploading file %s', error)
      return response.status(500).json({ message: 'Error uploading file ' + error })
    }
  }

  /**
   * Retrieves an image based on the provided filename parameter.
   * 
   * @param {HttpContext} context - The HTTP context containing the request parameters and response object.
   * @param {Object} context.params - The parameters from the HTTP request.
   * @param {string} context.params.filename - The name of the image file to retrieve.
   * @param {Object} context.response - The response object to send the image data.
   * 
   * @returns {Promise<void>} A promise that resolves when the image data is sent in the response.
   * 
   * @throws {Error} If the image with the specified filename is not found.
   */
  async getImage({ params, response }: HttpContext) {
    const image = await Image.findOrFail('name', params.filename)
    return response.json(image)
  }

  /**
   * Deletes an image based on the provided filename in the request parameters.
   * 
   * @param {HttpContext} context - The HTTP context containing the request parameters and response object.
   * @param {Object} context.params - The request parameters.
   * @param {string} context.params.filename - The filename of the image to be deleted.
   * @param {Object} context.response - The response object.
   * 
   * @returns {Promise<void>} - A promise that resolves when the image is deleted or an error occurs.
   * 
   * @throws {Error} - Throws an error if the image cannot be found or if there is an issue deleting the image.
   */
  async deleteImage({ params, response }: HttpContext) {
    const image = await Image.findByOrFail('name', params.filename)
    try {
      await ImageService.deleteImage(image)
      return response.ok('Image deleted')
    } catch (error) {
      logger.error('Error deleting file %s', error)
      return response.status(500).json({ message: 'Error deleting file ' + error })
    }
  }
}
