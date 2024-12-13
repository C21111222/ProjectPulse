import User from '#models/user'

export default class UserService {
  public static async getUserById(userId: number): Promise<User | null> {
    return User.find(userId)
  }

  public static async getUnreadMessages(user: User): Promise<any[]> {
    return user.getUnreadMessages()
  }
}