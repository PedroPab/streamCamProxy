import { Strategy as LocalStrategy } from 'passport-local';
import { UserModel } from '../../user/user.model.js';

export const localStrategy = new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password',
        session: false
    },
    async (email, password, done) => {
        try {
            const user = UserModel.findByEmail(email);

            if (!user) {
                return done(null, false, {
                    message: 'Email o contrasena incorrectos'
                });
            }

            if (!user.isActive) {
                return done(null, false, {
                    message: 'Cuenta desactivada. Contacta al administrador.'
                });
            }

            const isValidPassword = await UserModel.verifyPassword(password, user.password);

            if (!isValidPassword) {
                return done(null, false, {
                    message: 'Email o contrasena incorrectos'
                });
            }

            UserModel.updateLastLogin(user.id);

            const { password: _, refreshToken: __, ...safeUser } = user;
            return done(null, safeUser);

        } catch (error) {
            return done(error);
        }
    }
);

export default localStrategy;
