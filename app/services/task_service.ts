import Task from '#models/task'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

export default class TaskService {
  public static async getUserTasks(userId: number): Promise<Task[]> {
    const user = await User.findOrFail(userId)
    return user.related('tasks').query().exec()
  }

  public static async getTask(taskId: number): Promise<Task | null> {
    return Task.find(taskId)
  }

  public static async getTeamTasks(teamId: number): Promise<Task[]> {
    return db.from('tasks').where('team_id', teamId).orderBy('start_date', 'asc')
  }

  public static async getTaskUsers(taskId: number): Promise<any[]> {
    return db
      .from('users')
      .select('user_id', 'full_name', 'email', 'image_url')
      .innerJoin('user_tasks', 'users.id', 'user_tasks.user_id')
      .where('user_tasks.task_id', taskId)
  }

  public static async createTask(data: any): Promise<Task> {
    return Task.create(data)
  }

  public static async addUsersToTask(taskId: number, userIds: number[]): Promise<void> {
    for (const userId of userIds) {
      const user = await User.find(userId)
      if (user) {
        await user.related('tasks').attach([taskId])
      }
    }
  }

  public static async deleteTask(taskId: number): Promise<void> {
    const task = await Task.findOrFail(taskId)
    await task.delete()
  }

  public static async updateTask(taskId: number, data: any): Promise<Task> {
    const task = await Task.findOrFail(taskId)
    task.merge(data)
    await task.save()
    return task
  }
}