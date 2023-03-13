import { serialize } from '../utilities/methods';
import { ObjectAny } from '../utilities/interfaces';

const { Readable } = require("stream")
const csv = require('csv-parser')

// export const masterURL = window.location.origin
export const masterURL = 'http://localhost:5987'

export interface Header {
  name: string
  type: string
  dbType: string
}
export class Response {
  response: globalThis.Response
  data: any
  error: string

  constructor(data : ObjectAny = {}){
    this.response = data.response
    this.data = data.data
    this.error = data.error
  }

  get type() {
    return this.response?.headers.get('content-type') || ''
  }

  async json() {
    let data : any
    if(isJsonContent(this.type)) data = this.data || await this.response?.json()
    return data
  }

  headers() {
    let headers :  Header[] = []
    let val = this.response.headers.get('X-Request-Columns') || ''
    if(!val) return headers
    let items = JSON.parse(val) as any[][]
    for(let item of items) {
      let header = {
        name: item[0],
        type: item[1],
        dbType: item[2],
      }
      headers.push(header)
    }
    return headers
  }

  async records() {
    let recs :  ObjectAny[] = []
    try {
      if(isJsonContent(this.type)) {
        recs = this.data || await this.response?.json()
      } else if(isJsonLinesContent(this.type)) {
        let headers = this.headers()
        let rows = await this.rows()
        for(let row of rows) {
          let rec : ObjectAny = {}
          for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            rec[header.name] = row[i]
          }
          recs.push(rec)
        }
      }
    } catch (error) {
      console.log(error)
    }
    return recs
  }

  async rows() {
    let rows :  any[][] = []
    if(!this.response) return rows

    if(isJsonContent(this.type)) {
      let headers = this.headers()
      let records = await this.records()
      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        let row = headers.map(h => rec[h.name])
        rows.push(row)
      }
    } else if(isJsonLinesContent(this.type)) {
      let lines = (this.data || await this.response.text()).split('\n')
      for (let i = 0; i < lines.length; i++) {
        if(i === 0) continue // header row
        const line = lines[i] as string;
        if(!line.trim()) continue
        let row = JSON.parse(line) as any[]
        rows.push(row)
      }
      
      // TODO: read stream? https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams
      // let reader = this.response.body?.getReader()
      // if(!reader) return rows
    } else if(this.type.startsWith('text/')) {
      let text = this.data || await this.response.text()
      let separator = this.type === 'text/plain' ? '\t' : ','
      const readable = Readable.from([text]) // https://stackoverflow.com/a/59638132/2295355
      
      let lineC = 0
      await readable.pipe(csv({ separator }))
            .on('data', (data: any) => {
              lineC++
              if(lineC > 1) rows.push(data) // first line is headers
            })
    }
    return rows
  }

  async download(name: string, type: 'csv' | 'json' | 'jsonlines') {
    var url = URL.createObjectURL(await this.response.blob());
    var a = document.createElement('a');
    a.href = url;
    a.download = `${name}.${type}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export const apiPost = async (route: string, payload: ObjectAny | string | undefined = undefined, extraHeaders={}) => {
  let url = `${masterURL}${route}`
  let headers : ObjectAny  = Object.assign({ 
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-Request-ID, X-Request-Columns, X-Request-Continue',
  }, extraHeaders)

  let body = JSON.stringify(payload)
  if((typeof payload) === 'string'){
    body = `${payload}`
  } else { 
    headers['Content-Type'] = 'application/json'
  }

  let response = await fetch(url, {
    method: 'post',
    headers: headers,
    body: body,
  })

  let data : any
  let respType = response.headers.get('content-type') || ''
  if(isJsonContent(respType)) data = await response.json()
  
  return new Response({
    response: response,
    type: respType,
    data: data,
    error: data?.error,
  })
}


export const apiGet = async (route: string, payload={}, extraHeaders={}) => {
  let suffix = serialize(payload)
  let url = `${masterURL}${route}`
  url = url.includes('?') ? `${url}&${suffix}` : `${url}?${suffix}`
  let headers : ObjectAny  = Object.assign({ 
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'X-Request-ID, X-Request-Columns, X-Request-Continue',
    'Content-Type': 'application/json',
  }, extraHeaders)
  let response = await fetch(url, { headers })

  let data : any
  let respType = response.headers.get('content-type') || ''
  if(isJsonContent(respType)) data = await response.json()

  return new Response({
    response: response,
    type: respType,
    data: data,
    error: data?.error,
  })
}

const isJsonContent = (contentType: string) => contentType.includes('application/json') && !isJsonLinesContent(contentType)
const isJsonLinesContent = (contentType: string) => contentType.includes('application/jsonline')
