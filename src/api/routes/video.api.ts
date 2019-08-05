import { NextFunction, Request, Response, Router } from "express"

import { Video, VideoModel } from './../../models/video.model'

export class VideoApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.init()
    }

    public init() {
        this.router.get("/", this.index)
        this.router.get("/id", this.show)
        this.router.post("/", this.store)
    }

    public index(req: Request, res: Response) {
        VideoModel.find({}, (err, collection) => {
            if (err) {
                res.status(500).send(err)
            }

            if (!collection) {
                res.status(204)
            }

            res.status(200).send(collection)
        })
    }

    public show(req: Request, res: Response) {
        VideoModel.findById(req.params.id, (err, document) => {
            if (err) {
                res.status(500).send(err)
            }

            if (!document) {
                res.status(204)
            }

            res.status(200).send(document)
        })
    }

    public store(req: Request, res: Response) {
        VideoModel.create(req.body, (err, document) => {
            if (err) {
                res.status(500).send(err)
            }

            res.status(201).send(document)
        })
    }
}

const videoApi = new VideoApi()
export default videoApi.router
