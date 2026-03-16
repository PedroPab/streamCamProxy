import passport from 'passport';
import { localStrategy } from './strategies/local.strategy.js';
import { jwtStrategy } from './strategies/jwt.strategy.js';

export function configurePassport() {
    passport.use('local', localStrategy);
    passport.use('jwt', jwtStrategy);

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        done(null, { id });
    });

    return passport;
}

export default passport;
