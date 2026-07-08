import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-clinic-key';

export class AuthService {
  /**
   * Registra um novo Estagiário no sistema (status PENDENTE)
   */
  static async register(data: { name: string; email: string; password: string; matricula: string; semestre: string }) {
    const { name, email, password, matricula } = data;

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('E-mail já cadastrado.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Cria o usuário e o perfil de Estagiário na mesma transação
    const user = await prisma.usuario.create({
      data: { 
        nome: name, 
        email, 
        senhaHash: hashedPassword, 
        perfil: 'ESTAGIARIO', 
        status: 'PENDENTE',
        estagiario: {
          create: {
            matricula,
            cargaHorariaSemanal: 20, // default CH
            dataInicio: new Date(),   // default data de inicio
            ativo: false // Aguardando aprovação do Gestor
          }
        }
      }
    });

    return { id: user.id, email: user.email };
  }

  /**
   * Autentica um usuário e gera um token JWT
   */
  static async login(credentials: { email: string; password: string }) {
    const { email, password } = credentials;

    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Credenciais inválidas.');
    }

    const validPassword = await bcrypt.compare(password, user.senhaHash);
    if (!validPassword) {
      throw new Error('Credenciais inválidas.');
    }

    // ROOT sempre pode logar — é o superusuário do sistema
    // Contas PENDENTES bloqueadas até aprovação de estagiário/gestor
    if (user.perfil !== 'ROOT' && user.status === 'PENDENTE') {
      const error: any = new Error('Conta pendente de aprovação. Aguarde um responsável da clínica aprovar seu acesso.');
      error.statusConta = 'PENDENTE';
      throw error;
    }

    if (user.status === 'BLOQUEADO') {
      throw new Error('Conta bloqueada. Entre em contato com o gestor da clínica.');
    }

    const token = jwt.sign(
      { id: user.id, perfil: user.perfil, status: user.status },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, status: user.status }
    };
  }

  /**
   * Redefine a senha de um usuário e gera uma senha temporária
   */
  static async forgotPassword(email: string) {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      const error: any = new Error('Conta não encontrada.');
      error.statusCode = 404;
      throw error;
    }

    // Gera senha temporária alfanumérica de 6 dígitos
    const tempPassword = Math.random().toString(36).slice(-6).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.usuario.update({
      where: { id: user.id },
      data: { senhaHash: hashedPassword }
    });

    return tempPassword;
  }
}
