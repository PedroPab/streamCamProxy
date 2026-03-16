import passport from 'passport';

export function authenticate(req, res, next) {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Error de autenticacion',
                details: err.message
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'No autorizado',
                message: info?.message || 'Token invalido o expirado'
            });
        }

        req.user = user;
        next();
    })(req, res, next);
}

export function authenticateLocal(req, res, next) {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Error de autenticacion',
                details: err.message
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales invalidas',
                message: info?.message || 'Email o contrasena incorrectos'
            });
        }

        req.user = user;
        next();
    })(req, res, next);
}

export default { authenticate, authenticateLocal };
