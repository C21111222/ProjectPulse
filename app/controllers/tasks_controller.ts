// import type { HttpContext } from '@adonisjs/core/http'

import Task from '#models/task'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'

export default class TasksController {
  async getUserTasks({ response, auth, request }) {
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({
        message: 'User not found',
      })
    }
    // on recupere les taches de l'utilisateur
    const tasks = await user.related('tasks').query().exec()
    return response.status(200).json(tasks)
  }

  async getTeamTasks({ response, auth, params }) {
    const user = await User.find(auth.user.id)
    logger.info('Getting team tasks')
    if (!user) {
      return response.status(404).json({
        message: 'User not found',
      })
    }
    // on recupere l'id de l'equipe de l'utilisateur
    const teamId = params.id
    logger.info('Team id: ' + teamId)
    if (!teamId) {
      return response.status(400).json({
        message: 'Team id is required',
      })
    }
    // on verifie que l'utilisateur fait bien partie de l'equipe
    const team = await db.from('user_teams').where('user_id', user.id).andWhere('team_id', teamId).first()
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
    logger.info(tasks)
    return response.status(200).json(tasks)
  }

  async addTask({ response, auth, request }) {
    logger.info('Adding task')
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({
        message: 'User not found',
      })
    }
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
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({
        message: 'User not found',
      })
    }
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
    const user = await User.find(auth.user.id)
    if (!user) {
      return response.status(404).json({
        message: 'User not found',
      })
    }
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
}
