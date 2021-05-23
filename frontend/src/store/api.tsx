import { serialize } from '../utilities/methods';
import axios from 'axios'

export const masterURL = window.location.origin
// export const masterURL = 'http://localhost:5987'

// export const apiPost = async (route: string, payload={}) => {
//   let url = `${masterURL}/${route}`
//   let response = await fetch(url, {
//     method: 'post',
//     headers: { 'Access-Control-Allow-Origin': '*', "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   })
//   let data = await response.json()
//   return data
// }

export const apiPost = async (route: string, payload={}) => {
  let url = `${masterURL}/${route}`
  let response = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    timeout: 6*60*60*1000
  }) // 6 hour timeout
  let data = response.data
  return data
}

export const apiGet = async (route: string, payload={}) => {
  let url = `${masterURL}/${route}?${serialize(payload)}`
  let response = await fetch(url, {
    headers: { 'Access-Control-Allow-Origin': '*', "Content-Type": "application/json" },
  })
  let data = await response.json()
  return data
}
