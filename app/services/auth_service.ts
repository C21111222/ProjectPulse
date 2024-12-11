import User from '#models/user'
import { ResponseContract } from '@ioc:Adonis/Core/Response';


export default class AuthService {
  public async getAuthenticatedUser(auth : any, response: ResponseContract): Promise<User | null> {
    if (!auth.user) {
      response.status(401).json({ message: 'Vous devez être connecté pour accéder à cette page' });
      return null;
    }
    const user = await User.find(auth.user.id);
    if (!user) {
      response.status(404).json({ message: 'Utilisateur non trouvé' });
      return null;
    }
    return user;
  }
}
