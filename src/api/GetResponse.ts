import * as Promise from "bluebird"
import * as Restify from "restify"
import * as Qs from "qs"

export interface GetResponseConfig {
    apiKey: string
}

export interface customField {
    id: string
    value: Array<string | number | boolean>
}

export interface addContactOptions {
    name?: string
    email: string
    token: string
    dayOfCycle?: number
    ip?: string
    customFields?: Array<customField>
}

export interface updateContactOptions {
    name?: string
    token?: string // for move
    note?: string
    dayOfCycle?: number
    scoring?: number
    tags?: Array<string>
    customFields?: Array<customField>
}

export interface callOptions {
    method: Method
    path: string
    data?: any
}

export interface Contact {
    contactId: string
    href: string
    name: string | null
    email: string
    note: string | null
    origin: string
    dayOfCycle: number
    changedOn: null | string
    timeZone: string
    ipAddress: string
    activities: string
    campaign: {
        campaignId: string
        href: string
        name: string
    }
    createdOn: string
    scoring: null | number
}

export type Method = "GET" | "POST" | "DELETE"

export class GetResponse {

    private readonly apiUrl: string = "https://api.getresponse.com"
    private readonly apiUrlVersion: string = "/v3"
    private config: GetResponseConfig
    private client: Restify.Client
    private _debug: boolean = false

    constructor(config: GetResponseConfig){
        this.config = config
    }

    debug(dbg: boolean): this {
        this._debug = dbg
        return this
    }

    addContact(data: addContactOptions): Promise<boolean> {
        let req: any = {
            email: data.email,
            dayOfCycle: data.dayOfCycle || 0
        }
        if(!this.isEmpty(data.name)) req.name = data.name
        if(!this.isEmpty(data.token)) req.campaign = { campaignId: data.token }
        if(!this.isEmpty(data.ip)) req.ipAddress = data.ip
        if(!this.isEmpty(data.customFields)){
            req.customFieldValues = []
            data.customFields!.forEach(field => {
                if(!this.isEmpty(field.id) && !this.isEmpty(field.value)){
                    req.customFieldValues.push({
                        customFieldId: field.id,
                        value: field.value
                    })
                }
            })
        }

        return this.call({
            method: "POST",
            path: "/contacts",
            data: req
        }).then(response => {
            return (response.res.statusCode === 202)
        }) //.catch(err => {
            /*
            if(
                err.res.statusCode === 409 ||
                (err.res.statusCode === 400 && err.obj.message === "Cannot add contact that is blacklisted") ||
                (err.res.statusCode === 400 && err.obj.message === "Email domain not exists")
            ) return false*/

            // throw err
        // })
    }

    findContactByEmail(email: string): Promise<Contact | null> {
        return this.call({
            method: "GET",
            path: "/contacts",
            data: {
                query: {
                    email: email
                }
            }
        }).then(response => {
            if(response.obj !== undefined && response.obj.length > 0)
                return response.obj[0]
            return null
        })
    }

    updateContact(contactId: string, data: updateContactOptions): Promise<Contact> {
        let req: any = {}
        if(!this.isEmpty(data.name)) req.name = data.name
        if(!this.isEmpty(data.note)) req.note = data.note
        if(!this.isEmpty(data.dayOfCycle)) req.dayOfCycle = data.dayOfCycle
        if(!this.isEmpty(data.token)) req.compaign = { campaignId: data.token }
        if(!this.isEmpty(data.scoring)) req.scoring = data.scoring
        if(!this.isEmpty(data.tags)) req.tags = data.tags
        if(!this.isEmpty(data.customFields)){
            req.customFieldValues = []
            data.customFields!.forEach(field => {
                if(!this.isEmpty(field.id) && !this.isEmpty(field.value)){
                    req.customFieldValues.push({
                        customFieldId: field.id,
                        value: field.value
                    })
                }
            })
        }

        return this.call({
            method: "POST",
            path: `/contacts/${contactId}`,
            data: req
        }).then(response => {
            return response.obj
        })
    }

    updateContactTags(contactId: string, data: updateContactOptions): Promise<Contact> {
        let req: any = {}
        if(!this.isEmpty(data.tags)) req.tags = data.tags

        return this.call({
            method: "POST",
            path: `/contacts/${contactId}/tags`,
            data: req
        }).then(response => {
            return response.obj
        })
    }

    deleteContact(contactId: string): Promise<boolean> {
        return this.call({
            method: "DELETE",
            path: `/contacts/${contactId}`
        }).then(response => {
            return (response.res.statusCode === 204)
        })
    }

    private isEmpty(data: any): boolean {
        if(Array.isArray(data)){
            let e = true
            data.forEach((d) => {
                if(!this.isEmpty(d)) e = false
            })
            return e
        }
        if(data === undefined || data === null || data === "") return true
        return false
    }

    private call(callData: callOptions): Promise<any> {

        let client = Restify.createJsonClient({
            url: this.apiUrl,
            requestTimeout: 5000,
            retry: false,
            headers: {
                "X-Auth-Token": `api-key ${this.config.apiKey}`
            }
        })

        return new Promise((resolve,reject) => {
            if(callData.method === "GET"){
                /* istanbul ignore if  */
                if(this._debug) console.log(`curl -H 'X-Auth-Token: api-key ${this.config.apiKey}' -H 'Content-Type: application/json' '${this.apiUrl}${this.apiUrlVersion}${callData.path}?${Qs.stringify(callData.data)}'`)
                client.get(`${this.apiUrlVersion}${callData.path}?${Qs.stringify(callData.data)}`,(err,req,res,obj) => {
                    /* istanbul ignore if  */
                    if(this._debug) console.log(obj)
                    if(err){
                        /* istanbul ignore if  */
                        if(this._debug) console.error(err)
                        return reject({
                            res: res,
                            obj: obj
                        })
                    }
                    resolve({
                        res: res,
                        obj: obj
                    })
                })
            }
            if(callData.method === "POST"){
                /* istanbul ignore if  */
                if(this._debug) console.log(`curl -X POST -H 'X-Auth-Token: api-key ${this.config.apiKey}' -H 'Content-Type: application/json' -d '${JSON.stringify(callData.data)}' '${this.apiUrl}${this.apiUrlVersion}${callData.path}'`)
                client.post(`${this.apiUrlVersion}${callData.path}`, callData.data,(err,req,res,obj) => {
                    /* istanbul ignore if  */
                    if(this._debug) console.log(obj)
                    if(err){
                        /* istanbul ignore if  */
                        if(this._debug) console.error(err)
                        return reject({
                            res: res,
                            obj: obj
                        })
                    }
                    resolve({
                        res: res,
                        obj: obj
                    })
                })
            }
            if(callData.method === "DELETE"){
                /* istanbul ignore if  */
                if(this._debug) console.log(`curl -X DELETE -H 'X-Auth-Token: api-key ${this.config.apiKey}' '${this.apiUrl}${this.apiUrlVersion}${callData.path}'`)
                client.del(`${this.apiUrlVersion}${callData.path}`,(err,req,res) => {
                    /* istanbul ignore if  */
                    if(this._debug) console.log(res)
                    if(err){
                        /* istanbul ignore if  */
                        if(this._debug) console.error(err)
                        return reject({
                            res: res
                        })
                    }
                    resolve({
                        res: res
                    })
                })
            }
        })
    }
}
