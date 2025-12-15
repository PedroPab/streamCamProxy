import homeRouter from "./home.js";
import streamRouter from "./stream.js";

const routes = (req, res) => {
    const url = req.url

    switch (url) {
        case '/stream':
            streamRouter(req, res);
            break
        case '/':
            homeRouter(req, res);
            break
        default:
            res.writeHead(404);
            res.end('Not found');
    }
}

export default routes