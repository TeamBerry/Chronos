import { NextFunction, Request, Response, Router } from "express"

import { QueueItem,  VideoSubmissionRequest, QueueItemActionRequest, BoxScope, PlaylistSubmissionRequest } from "@teamberry/muscadine"
const auth = require("./../middlewares/auth.middleware")
const boxMiddleware = require("./../middlewares/box.middleware")

import * as Queue from 'bull'
import { QueueItemModel } from "../../models/queue-item.model"
const queueActionsQueue = new Queue("actions-queue")

export class QueueApi {
    public router: Router

    constructor() {
        this.router = Router({ mergeParams: true })
        this.init()
    }

    public init(): void {
        this.router.get("/", [auth.canBeAuthorized, boxMiddleware.publicOrPrivateWithSubscription], this.getQueue)

        // All subsequent routes require authentication
        this.router.use([auth.isAuthorized, boxMiddleware.publicOrPrivateWithSubscription, boxMiddleware.openOnly])
        this.router.post("/video", this.addVideo.bind(this))
        this.router.post("/playlist", this.addPlaylist.bind(this))
        this.router.put("/skip", this.skipVideo)
        this.router.put("/:video/next", this.playNext)
        this.router.put("/:video/now", this.playNow)
        this.router.put("/:video/replay", this.replayVideo)
        this.router.delete("/:video", this.removeVideo)

        this.router.param("video", async (request: Request, response: Response, next: NextFunction) => {
            const box = response.locals.box

            if (!await QueueItemModel.exists({ box: box._id, _id: request.params.video})) {
                return response.status(404).send('VIDEO_NOT_FOUND')
            }

            next()
        })
    }

    public async getQueue(request: Request, response: Response): Promise<Response> {
        const queue = await QueueItemModel
            .find({
                box: request.params.box
            })
            .sort({ submittedAt: -1 })
            .lean()

        return response.status(200).send(queue)
    }

    public async addVideo(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        if (!request.body.link) {
            return response.status(412).send('MISSING_PARAMETERS')
        }

        try {
            queueActionsQueue.add({
                type: 'addVideo',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user,
                    link: request.body.link,
                    flag: request.body.flag ?? null
                } as VideoSubmissionRequest
            }, {
                attempts: 10,
                removeOnComplete: true
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }

    public async addPlaylist(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        if (!request.body._id) {
            return response.status(412).send('MISSING_PARAMETERS')
        }

        try {
            queueActionsQueue.add({
                type: 'addPlaylist',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user,
                    playlistId: request.body._id
                } as PlaylistSubmissionRequest
            }, {
                attempts: 10,
                removeOnComplete: true
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }

    public async playNext(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        try {
            queueActionsQueue.add({
                type: 'playNext',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user,
                    item: request.params.video
                } as QueueItemActionRequest
            }, {
                attempts: 5,
                removeOnComplete: true
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }

    public async playNow(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        try {
            queueActionsQueue.add({
                type: 'playNow',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user,
                    item: request.params.video
                } as QueueItemActionRequest
            }, {
                attempts: 5,
                removeOnComplete: true
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }

    public async replayVideo(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        try {
            queueActionsQueue.add({
                type: 'replayVideo',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user,
                    item: request.params.video
                } as QueueItemActionRequest
            }, {
                attempts: 5,
                removeOnComplete: true
            })

            return response.status(503).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }

    public async skipVideo(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        try {
            queueActionsQueue.add({
                type: 'skipVideo',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user
                } as BoxScope
            }, {
                attempts: 3,
                removeOnComplete: true
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }

    public async removeVideo(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        try {
            queueActionsQueue.add({
                type: 'removeVideo',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user,
                    item: request.params.video
                } as QueueItemActionRequest
            }, {
                attempts: 5,
                removeOnComplete: true
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }
}

const queueApi = new QueueApi()
export default queueApi.router
