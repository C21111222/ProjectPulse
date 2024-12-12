// import type { HttpContext } from '@adonisjs/core/http'

import Task from '#models/task'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import AuthService from '#services/auth_service'
export default class TasksController {
  private authService = new AuthService()
  async getUserTasks({ response, auth, request }) {
    const user = await this.authService.getAuthenticatedUser(auth, response)
    if (!user) return
    // on recupere les taches de l'utilisateur
    const tasks = await user.related('tasks').query().exec()
    return response.status(200).json(tasks)
  }

  async getTask({ response, auth, params }) {
    logger.info('Getting task')
    const user = await this.authService.getAuthenticatedUser(auth, response)
    if (!user) return
    const taskId = params.id
    logger.info('Task id: ' + taskId)
    if (!taskId) {
      return response.status(400).json({
        message: 'Task id is required',
      })
    }
    const task = await Task.find(taskId)
    if (!task) {
      return response.status(404).json({
        message: 'Task not found',
      })
    }
    const team = await user.related('teams').query().where('team_id', task.teamId).first()
    if (!team) {
      return response.status(403).json({
        message: 'You are not part of this team',
      })
    }
    return response.status(200).json(task)
  }

  async getTeamTasks({ response, auth, params }) {
    logger.info('Getting team tasks')
    const user = await this.authService.getAuthenticatedUser(auth, response)
    if (!user) return
    // on recupere l'id de l'equipe de l'utilisateur
    const teamId = params.id
    logger.info('Team id: ' + teamId)
    if (!teamId) {
      return response.status(400).json({
        message: 'Team id is required',
      })
    }
    // on verifie que l'utilisateur fait bien partie de l'equipe
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
    logger.info('Tasks retrieved')
    return response.status(200).json(tasks)
  }

  async getTeamTaskStat({ response, auth, params }) {
    logger.info('Getting team task stat')
    const user = await this.authService.getAuthenticatedUser(auth, response)
    if (!user) return
    const teamId = params.id
    logger.info('Team id: ' + teamId)
    if (!teamId) {
      return response.status(400).json({
        message: 'Team id is required',
      })
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
    const tasks = await db.from('tasks').where('team_id', teamId)
    const stat = {
      total: tasks.length,
      done: tasks.filter((task) => task.status === 'done').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      waiting: tasks.filter((task) => task.status === 'waiting').length,
    }
    logger.info('Team task stat retrieved')
    return response.status(200).json(stat)
  }

  async addTask({ response, auth, request }) {
    logger.info('Adding task')
    const user = await this.authService.getAuthenticatedUser(auth, response)
    if (!user) return
    const teamId = request.input('teamId')
    if (!teamId) {
      return response.status(400).json({
        message: 'Team id is required',
      })
    }
    const team = await user.related('teams').query().where('team_id', teamId).first()
    if (!team) {
      return response.status(403).json({
        message: 'You are not part of this team',
      })
    }
    const task = await Task.create({
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
      for (const userId of users) {
        const userToAdd = await User.find(userId)
        if (userToAdd) {
          await userToAdd.related('tasks').attach([task.id])
        }
      }
    }

    return response.status(201).json(task)
  }

  async addUsersToTask({ response, auth, request }) {
    const user = await this.authService.getAuthenticatedUser(auth, response)
    if (!user) return
    const taskId = request.input('taskId')
    if (!taskId) {
      return response.status(400).json({
        message: 'Task id is required',
      })
    }
    const task = await Task.find(taskId)
    if (!task) {
      return response.status(404).json({
        message: 'Task not found',
      })
    }
    const team = await user.related('teams').query().where('team_id', task.teamId).first()
    if (!team) {
      return response.status(403).json({
        message: 'You are not part of this team',
      })
    }
    // soit l'utilisateur est le createur de la tache soit il est admin ou manager de l'equipe
    const userRole = await db
      .from('user_teams')
      .where('user_id', user.id)
      .andWhere('team_id', task.teamId)
      .first()
    const isCreator = await db
      .from('user_tasks')
      .where('user_id', user.id)
      .andWhere('task_id', task.id)
      .first()
    if (userRole !== 'admin' && userRole !== 'manager' && !isCreator) {
      return response.status(403).json({
        message: 'You are not allowed to add users to this task',
      })
    }
    const userId = request.input('user_id')
    if (!userId) {
      return response.status(400).json({
        message: 'User id is required',
      })
    }
    const userToAdd = await User.find(userId)
    if (!userToAdd) {
      return response.status(404).json({
        message: 'User not found',
      })
    }
    await userToAdd.related('tasks').attach([taskId])
    return response.status(201).json({
      message: 'User added to task',
    })
  }

  async deleteTask({ response, auth, request }) {
    logger.info('Deleting task')
    const user = await this.authService.getAuthenticatedUser(auth, response)
    if (!user) return
    const taskId = request.input('taskId')
    if (!taskId) {
      return response.status(400).json({
        message: 'Task id is required',
      })
    }
    const task = await Task.find(taskId)
    if (!task) {
      return response.status(404).json({
        message: 'Task not found',
      })
    }
    const team = await user.related('teams').query().where('team_id', task.teamId).first()
    if (!team) {
      return response.status(403).json({
        message: 'You are not part of this team',
      })
    }
    const userRole = await db
      .from('user_teams')
      .where('user_id', user.id)
      .andWhere('team_id', task.teamId)
      .first()
    const isCreator = await db
      .from('user_tasks')
      .where('user_id', user.id)
      .andWhere('task_id', task.id)
      .first()
    if (userRole !== 'admin' && userRole !== 'manager' && !isCreator) {
      return response.status(403).json({
        message: 'You are not allowed to delete this task',
      })
    }
    await task.delete()
    return response.status(200).json({
      message: 'Task deleted',
    })
  }

  async updateTask({ response, auth, request }) {
    logger.info('Updating task')
    const user = await this.authService.getAuthenticatedUser(auth, response)
    if (!user) return
    const taskId = request.input('taskId')
    if (!taskId) {
      logger.error('Task id is required')
      return response.status(400).json({
        message: 'Task id is required',
      })
    }
    const task = await Task.find(taskId)
    if (!task) {
      logger.error('Task not found')
      return response.status(404).json({
        message: 'Task not found',
      })
    }
    const team = await user.related('teams').query().where('team_id', task.teamId).first()
    if (!team) {
      logger.error('You are not part of this team')
      return response.status(403).json({
        message: 'You are not part of this team',
      })
    }
    const userRole = await db
      .from('user_teams')
      .where('user_id', user.id)
      .andWhere('team_id', task.teamId)
      .first()
    const isCreator = await db
      .from('user_tasks')
      .where('user_id', user.id)
      .andWhere('task_id', task.id)
      .first()
    if (userRole.role !== 'admin' && userRole.role !== 'manager' && !isCreator) {
      logger.error('You are not allowed to update this task')
      return response.status(403).json({
        message: 'You are not allowed to update this task',
      })
    }
    task.status = request.input('status')
    task.priority = request.input('priority')
    task.startDate = request.input('start_date')
    task.endDate = request.input('end_date')
    await task.save()
    logger.info('Task updated')
    return response.status(200).json(task)
  }
}
