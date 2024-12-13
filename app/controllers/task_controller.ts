import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import TaskService from '#services/task_service'
import TeamService from '#services/team_service'
import AuthService from '#services/auth_service'
import UserService from '#services/user_service'
import db from '@adonisjs/lucid/services/db'

export default class TasksController {

  /**
   * Retrieves the tasks associated with the authenticated user.
   *
   * @param {HttpContext} context - The HTTP context containing the response and authentication objects.
   * @returns {Promise<void>} - A promise that resolves with the user's tasks in the response.
   */
  async getUserTasks({ response, auth }: HttpContext) {
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return

    const tasks = await TaskService.getUserTasks(user.id)
    return response.status(200).json(tasks)
  }

  /**
   * Retrieves a task based on the provided task ID.
   * 
   * @param {HttpContext} context - The HTTP context containing the response, authentication, and parameters.
   * @returns {Promise<void>} - A promise that resolves to void.
   * 
   * @example
   * // payload
   * {
   *  id: 1
   * }
   */
  async getTask({ response, auth, params }: HttpContext) {
    logger.info('Getting task')
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return

    const taskId = params.id
    logger.info('Task id: ' + taskId)
    if (!taskId) {
      return response.status(400).json({ message: 'Task id is required' })
    }

    const task = await TaskService.getTask(taskId)
    if (!task) {
      return response.status(404).json({ message: 'Task not found' })
    }

    if (!await TeamService.isUserMemberOfTeam(user.id, task.teamId)) {
      return response.status(403).json({ message: 'You are not part of this team' })
    }

    return response.status(200).json(task)
  }

  /**
   * Retrieves the tasks for a specific team, ordered by start date.
   * 
   * @param {HttpContext} context - The HTTP context containing the request and response objects.
   * @param {object} context.response - The response object to send the HTTP response.
   * @param {object} context.auth - The authentication object containing the authenticated user.
   * @param {object} context.params - The request parameters containing the team ID.
   * 
   * @returns {Promise<void>} - A promise that resolves when the tasks have been retrieved and the response has been sent.
   * 
   * @throws {Error} - Throws an error if the user is not authenticated, the team ID is not provided, or the user is not a member of the team.
   */
  async getTeamTasks({ response, auth, params }: HttpContext) {
    logger.info('Getting team tasks')
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return

    const teamId = params.id
    logger.info('Team id: ' + teamId)
    if (!teamId) {
      return response.status(400).json({ message: 'Team id is required' })
    }

    if (!await TeamService.isUserMemberOfTeam(user.id, teamId)) {
      return response.status(403).json({ message: 'You are not part of this team' })
    }

    const team = await db
    .from('user_teams')
    .where('user_id', user.id)
    .andWhere('team_id', teamId)
    .first()
  if (!team) {
    return response.status(403).json({
      message: 'You are not part of this team',
    })
  }
  // on recupere les taches de l'equipe, ordonnees par date de debut
  const tasks = await db.from('tasks').where('team_id', teamId).orderBy('start_date', 'asc')
  //
  for (const task of tasks) {
    task.users = await db
      .from('users')
      .select('user_id', 'full_name', 'email', 'image_url') // Select only the necessary fields
      .innerJoin('user_tasks', 'users.id', 'user_tasks.user_id')
      .where('user_tasks.task_id', task.id)
  }
    return response.status(200).json(tasks)
  }

  /**
   * Retrieves the task statistics for a specific team.
   * 
   * @param {HttpContext} context - The HTTP context containing the request and response objects.
   * @param {object} context.response - The response object to send the HTTP response.
   * @param {object} context.auth - The authentication object containing the user's authentication information.
   * @param {object} context.params - The parameters object containing the route parameters.
   * @param {string} context.params.id - The ID of the team for which to retrieve task statistics.
   * 
   * @returns {Promise<void>} - A promise that resolves when the task statistics have been retrieved and the response has been sent.
   * 
   * @throws {Error} - Throws an error if the user is not authenticated or if the team ID is not provided.
   * 
   * @example
   * // Example parameters object
   * {
   * id: 1
   * }
   */
  async getTeamTaskStat({ response, auth, params }: HttpContext) {
    logger.info('Getting team task stat')
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return

    const teamId = params.id
    logger.info('Team id: ' + teamId)
    if (!teamId) {
      return response.status(400).json({ message: 'Team id is required' })
    }

    if (!await TeamService.isUserMemberOfTeam(user.id, teamId)) {
      return response.status(403).json({ message: 'You are not part of this team' })
    }

    const tasks = await TaskService.getTeamTasks(teamId)
    const stat = {
      total: tasks.length,
      done: tasks.filter((task) => task.status === 'done').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      waiting: tasks.filter((task) => task.status === 'waiting').length,
    }
    logger.info('Team task stat retrieved')
    return response.status(200).json(stat)
  }

  /**
   * Adds a new task to the specified team.
   * 
   * @param {HttpContext} context - The HTTP context containing the request, response, and authentication objects.
   * @returns {Promise<void>} - A promise that resolves when the task is added.
   * 
   * @remarks
   * This method performs the following steps:
   * 1. Logs the action of adding a task.
   * 2. Retrieves the authenticated user.
   * 3. Validates the presence of the team ID in the request.
   * 4. Checks if the user is a member of the specified team.
   * 5. Creates a new task with the provided details.
   * 6. Optionally assigns users to the created task.
   * 
   * @throws {Error} - If the team ID is not provided or the user is not a member of the team.
   * 
   * @example
   * // Example request payload
   * {
   *   "teamId": "123",
   *   "title": "New Task",
   *   "description": "Task description",
   *   "status": "open",
   *   "priority": "high",
   *   "start_date": "2023-01-01",
   *   "end_date": "2023-01-31",
   *   "users": ["user1", "user2"]
   * }
   */
  async addTask({ response, auth, request }: HttpContext) {
    logger.info('Adding task')
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return

    const teamId = request.input('teamId')
    if (!teamId) {
      return response.status(400).json({ message: 'Team id is required' })
    }

    if (!await TeamService.isUserMemberOfTeam(user.id, teamId)) {
      return response.status(403).json({ message: 'You are not part of this team' })
    }

    const task = await TaskService.createTask({
      title: request.input('title'),
      description: request.input('description'),
      status: request.input('status'),
      priority: request.input('priority'),
      startDate: request.input('start_date'),
      endDate: request.input('end_date'),
      teamId: teamId,
    })

    const users = request.input('users')
    if (users) {
      await TaskService.addUsersToTask(task.id, users)
    }

    return response.status(201).json(task)
  }

  /**
   * Adds users to a task.
   * 
   * @param {HttpContext} context - The HTTP context containing the request, response, and authentication objects.
   * @returns {Promise<void>} - A promise that resolves when the operation is complete.
   * 
   * @remarks
   * This method performs several checks before adding a user to a task:
   * - It ensures the authenticated user is valid.
   * - It checks if the task ID is provided and valid.
   * - It verifies that the authenticated user is a member of the team associated with the task.
   * - It checks if the authenticated user is an admin, manager, or the creator of the task.
   * - It ensures the user ID to be added is provided and valid.
   * 
   * If any of these checks fail, an appropriate HTTP response is returned.
   * 
   * @param {HttpContext} context.response - The HTTP response object.
   * @param {HttpContext} context.auth - The authentication object.
   * @param {HttpContext} context.request - The HTTP request object.
   * 
   * @throws {Error} - Throws an error if the operation fails.
   */
  async addUsersToTask({ response, auth, request }: HttpContext) {
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return

    const taskId = request.input('taskId')
    if (!taskId) {
      return response.status(400).json({ message: 'Task id is required' })
    }

    const task = await TaskService.getTask(taskId)
    if (!task) {
      return response.status(404).json({ message: 'Task not found' })
    }

    if (!await TeamService.isUserMemberOfTeam(user.id, task.teamId)) {
      return response.status(403).json({ message: 'You are not part of this team' })
    }

    const userRole = await TeamService.isUserAdminOrManagerOfTeam(user.id, task.teamId)
    const isCreator = await db
      .from('user_tasks')
      .where('user_id', user.id)
      .andWhere('task_id', task.id)
      .first()

    if (!userRole && !isCreator) {
      return response.status(403).json({ message: 'You are not allowed to add users to this task' })
    }

    const userId = request.input('user_id')
    if (!userId) {
      return response.status(400).json({ message: 'User id is required' })
    }

    const userToAdd = await UserService.getUserById(userId)
    if (!userToAdd) {
      return response.status(404).json({ message: 'User not found' })
    }

    await TaskService.addUsersToTask(taskId, [userId])
    return response.status(201).json({ message: 'User added to task' })
  }

  /**
   * Deletes a task based on the provided task ID.
   * 
   * @param {HttpContext} context - The HTTP context containing the request, response, and authentication objects.
   * @returns {Promise<void>} - A promise that resolves when the task is deleted or an appropriate response is sent.
   * 
   * @throws {Error} - Throws an error if the task ID is not provided, the task is not found, the user is not part of the team, or the user is not allowed to delete the task.
   * 
   * @example
   * // Example usage:
   * const context = { request, response, auth };
   * await deleteTask(context);
   */
  async deleteTask({ response, auth, request }: HttpContext) {
    logger.info('Deleting task')
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return

    const taskId = request.input('taskId')
    if (!taskId) {
      return response.status(400).json({ message: 'Task id is required' })
    }

    const task = await TaskService.getTask(taskId)
    if (!task) {
      return response.status(404).json({ message: 'Task not found' })
    }

    if (!await TeamService.isUserMemberOfTeam(user.id, task.teamId)) {
      return response.status(403).json({ message: 'You are not part of this team' })
    }

    const userRole = await TeamService.isUserAdminOrManagerOfTeam(user.id, task.teamId)
    const isCreator = await db
      .from('user_tasks')
      .where('user_id', user.id)
      .andWhere('task_id', task.id)
      .first()

    if (!userRole && !isCreator) {
      return response.status(403).json({ message: 'You are not allowed to delete this task' })
    }

    await TaskService.deleteTask(taskId)
    return response.status(200).json({ message: 'Task deleted' })
  }

  /**
   * Updates a task with the provided details.
   * 
   * @param {HttpContext} context - The HTTP context containing the request, response, and authentication objects.
   * @returns {Promise<void>} - A promise that resolves when the task is updated.
   * 
   * @remarks
   * This method performs several checks before updating the task:
   * - Ensures the user is authenticated.
   * - Validates the presence of the task ID in the request.
   * - Checks if the task exists.
   * - Verifies if the user is a member of the team associated with the task.
   * - Confirms if the user is an admin, manager, or the creator of the task.
   * 
   * If any of these checks fail, an appropriate error response is returned.
   * 
   * @example
   * ```typescript
   * // Example usage:
   * await updateTask({ response, auth, request });
   * ```
   */
  async updateTask({ response, auth, request }: HttpContext) {
    logger.info('Updating task')
    const user = await AuthService.getAuthenticatedUser(auth, response)
    if (!user) return

    const taskId = request.input('taskId')
    if (!taskId) {
      logger.error('Task id is required')
      return response.status(400).json({ message: 'Task id is required' })
    }

    const task = await TaskService.getTask(taskId)
    if (!task) {
      logger.error('Task not found')
      return response.status(404).json({ message: 'Task not found' })
    }

    if (!await TeamService.isUserMemberOfTeam(user.id, task.teamId)) {
      logger.error('You are not part of this team')
      return response.status(403).json({ message: 'You are not part of this team' })
    }

    const userRole = await TeamService.isUserAdminOrManagerOfTeam(user.id, task.teamId)
    const isCreator = await db
      .from('user_tasks')
      .where('user_id', user.id)
      .andWhere('task_id', task.id)
      .first()

    if (!userRole && !isCreator) {
      logger.error('You are not allowed to update this task')
      return response.status(403).json({ message: 'You are not allowed to update this task' })
    }

    const updatedTask = await TaskService.updateTask(taskId, {
      status: request.input('status'),
      priority: request.input('priority'),
      startDate: request.input('start_date'),
      endDate: request.input('end_date'),
    })

    logger.info('Task updated')
    return response.status(200).json(updatedTask)
  }
}