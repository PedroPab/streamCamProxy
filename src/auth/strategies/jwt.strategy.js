import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { UserModel } from '../../user/user.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token')
    ]),
    secretOrKey: JWT_SECRET,
    issuer: 'streamcam-api',
    audience: 'streamcam-client',
    algorithms: ['HS256']
};

export const jwtStrategy = new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
        if (payload.type !== 'access') {
            return done(null, false, {
                message: 'Token invalido'
            });
        }

        const user = UserModel.findById(payload.sub);

        if (!user) {
            return done(null, false, {
                message: 'Usuario no encontrado'
            });
        }

        if (!user.isActive) {
            return done(null, false, {
                message: 'Cuenta desactivada'
            });
        }

        return done(null, user);

    } catch (error) {
        return done(error);
    }
});

export default jwtStrategy;
