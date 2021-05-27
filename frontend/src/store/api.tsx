import { serialize } from '../utilities/methods';
import axios from 'axios' // eslint-disable-line

export const masterURL = window.location.origin
// export const masterURL = 'http://localhost:5987'

export interface Response {
  // response: globalThis.Response
  status: number
  statusText: string
  data: any
  error: string
}

export const apiPost = async (route: string, payload={}, extraHeaders={}) => {
  let url = `${masterURL}/${route}`
  let headers = Object.assign({ 'Access-Control-Allow-Origin': '*', "Content-Type": "application/json" }, extraHeaders)
  let response = await fetch(url, {
    method: 'post',
    headers: headers,
    body: JSON.stringify(payload),
  })
  let data = await response.json()
  
  return {
    status: response.status,
    statusText: response.statusText,
    data: data,
    error: data.error,
  } as Response
}

// export const apiPost = async (route: string, payload={}) => {
//   let url = `${masterURL}/${route}`
//   let response = await axios.post(url, payload, {
//     headers: {
//       'Content-Type': 'application/json',
//       'Access-Control-Allow-Origin': '*'
//     },
//     timeout: 6*60*60*1000
//   }) // 6 hour timeout
//   let data = response.data
//   return data
// }

export const apiGet = async (route: string, payload={}, extraHeaders={}) => {
  let url = `${masterURL}/${route}?${serialize(payload)}`
  let headers = Object.assign({ 'Access-Control-Allow-Origin': '*', "Content-Type": "application/json" }, extraHeaders)
  let response = await fetch(url, { headers })
  let data = await response.json()
  return {
    status: response.status,
    statusText: response.statusText,
    data: data,
    error: data.error,
  } as Response
}
