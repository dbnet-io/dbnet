import _ from "lodash";
import { ObjectAny, ObjectString } from "./interfaces";
import { Toast, ToastMessage } from 'primereact/toast';
import { FormEvent, RefObject, useEffect, useRef } from "react";

export const alpha  = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const alphanumeric  = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const serialize = function(obj: ObjectString) : string {
  var str = [];
  for (var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}

export const dict = function(arr : Array<{ [key: string]: string }>, key: string) {
  let obj : { [key: string]: string | object; } = {}
  for (let item of arr) {
    obj[item[key]] = item
  }
  return obj
}

export const post_form = function(path : string, params: ObjectString, method='post') {

  // The rest of this code assumes you are not using a library.
  // It can be made less wordy if you use one.
  const form = document.createElement('form');
  form.method = method;
  form.action = path;

  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      const hiddenField = document.createElement('input');
      hiddenField.type = 'hidden';
      hiddenField.name = key;
      hiddenField.value = params[key];

      form.appendChild(hiddenField);
    }
  }

  document.body.appendChild(form);
  form.submit();
}

export const new_ts_id = function(prefix='') {
  return `${prefix}${Date.now()}.${rand_str(alpha, 3)}`
}

export const rand_str = function(characters : string, length : number) {
  var result           = '';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export const snake_to_camel = function(str : string) {
  return str.replace(
  /([-_][a-z])/g,
  (group) => group.toUpperCase()
                  .replace('-', '')
                  .replace('_', '')
  )
}

export const clean_title = function(str : string) {
  return str.toUpperCase().replace(" ", "_")
}

export const title_case = function(str : string) {
  return str.replace(/(^|\s)\S/g, function(t) { return t.toUpperCase() });
}

export const data_req_to_records = function(data: any){
  let records : any[] = []
  if(data == null || Object.keys(data).length === 0 || data.rows.length === 0 || data.headers.length === 0) return records

  for (let row of data.rows) {
    let rec : ObjectAny = {}
    for (let i = 0; i < data.headers.length; i++) rec[data.headers[i]] = row[i]
    records.push(rec)
  }
  return records
}

export const split_schema_table = function(schema_table: string) {
  if(schema_table.includes('.')) {
    let arr = schema_table.split('.')
    return {schema: arr[0], table: arr[1]}
  }
  return {schema: '', table: schema_table}
}

export const filter_dt = function(orig_data : ObjectAny[], query : string) {
  if(!query) return orig_data
  let queries = query.toLowerCase().split(',')
  return orig_data.filter((r) => {
    let found = queries.map(() => false)
    for (const k in r) {
      for (let i = 0; i < queries.length; i++) {
        if(`${r[k]}`.toLowerCase().includes(queries[i])) found[i] = true
      }
    }
    return found.every((v) => v)
  })
}

export const do_filter = _.debounce(args => { 
  args.dt.loading = true
  args.dt.data = args.filter_dt(args.dt.orig_data, args.query)
  args.dt.loading = false
}, 500)

export const get_duration = function(secs : number) {
  let neg = ''
  if(secs == null || isNaN(secs)) return '-'

  if (secs < 0) neg = 'n'

  secs = Math.abs(secs)
  if (secs < 60) return `${secs}s` 
  if (secs < 3600) {
    let mins = Math.floor(secs/60)
    secs = secs - mins*60
    return `${neg}${mins}m${secs}s`
  }

  if (secs < 3600*24) {
    let hours = Math.floor(secs/3600)
    secs = secs - hours*3600
    let mins = Math.floor(secs/60)
    secs = secs - mins*60
    return `${neg}${hours}h${mins}m`
  }

  let days = Math.floor(secs/3600/24)
  secs = secs - days*3600*24
  let hours = Math.floor(secs/3600)
  secs = secs - hours*3600
  let mins = Math.floor(secs/60)
  secs = secs - mins*60
  return `${neg}${days}d${hours}h`
}

export function jsonClone<T = any>(val: any) { 
  if (IsValid(val)) {
    return JSON.parse(JSON.stringify(val)) as T
  }
  return {} as T
}

export const clearTooltips = function() {
  var elements = document.getElementsByClassName('p-tooltip')
  for(var e of elements as any) e.parentNode.removeChild(e);
}

export const calc_duration = function(date1: Date, date2: Date) {
  if(!date1) return '?'
  if(!date2) date2 = new Date()
  try {
    let secs = Math.floor((date2.getTime() - date1.getTime())/1000)
    return get_duration(secs)
  } catch(error) {
    console.error(error)
    return '-'
  }
}

export const relative_duration = function(date: Date|undefined, past_allowed=true) {
  if(!date) return ''
  let dur = calc_duration(date, new Date())
  if(dur === '-') return dur

  if(dur.startsWith('n')) {
    dur = dur.replace('n', '')
    return `in ${dur}`
  }
  if(!past_allowed) return '-'
  return `${dur} ago`
}

export const number_with_commas = function(x: number) {
  if(!x) return x
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export interface Funcs { 
  toast: (msg: ToastMessage) => void
  toastError: (summary: string, detail: string|null) => void
  toastSuccess: (summary: string, detail: string|null) => void
  toastInfo: (summary: string, detail: string|null) => void
}

export const genFuncs = (toast: RefObject<Toast>): Funcs => {
  return {
    toastError: (summary: string, detail: string|null) => doToast(toast, {
      severity:  'error',
      summary: `${summary}`,
      detail: `${detail}`,
    }),
    toastSuccess: (summary: string, detail: string|null) => doToast(toast, {
      severity:  'success',
      summary: `${summary}`,
      detail: `${detail}`,
    }),
    toastInfo: (summary: string, detail: string|null) => doToast(toast, {
      severity:  'info',
      summary: `${summary}`,
      detail: `${detail}`,
    }),
    toast: (msg: ToastMessage) => doToast(toast, {
      severity:  msg.severity,
      summary: `${msg.summary}`,
      detail: `${msg.detail}`,
      life: msg.life,
    })  
  }
}

export const doToast = (toast: any, msg: ToastMessage) => {
  if(toast === null || toast.current === null) return
  msg.life = msg.severity === 'error' ? 9000 : 3000;
  (toast.current as Toast).show(msg);
}

export const toastError = (summary: string, detail: any='') => {
  if(detail.toString().includes('Not logged in')) return
  console.error(detail)
  if(detail.response && detail.response.data && detail.response.data.error) {
    detail = detail.response.data.error
  }
  doToast(window.toast, {
    severity:  'error',
    summary: `${summary}`,
    detail: `${detail}`,
  })
}

export const toastSuccess = (summary: string, detail: string='') => doToast(window.toast, {
  severity:  'success',
  summary: `${summary}`,
  detail: `${detail}`,
})

export const toastInfo = (summary: string, detail: string='') => doToast(window.toast, {
  severity:  'info',
  summary: `${summary}`,
  detail: `${detail}`,
})

export const inputOnChange = (e: FormEvent<HTMLInputElement>, setFunc: React.Dispatch<any>) => setFunc((e as React.ChangeEvent<HTMLInputElement>).target.value)

export function useEffectAsync(asyncFn: any, onSuccess: any) {
  useEffect(() => {
    let isMounted = true;
    asyncFn().then((data: any) => {
      if (isMounted) onSuccess(data);
    });
    return () => { isMounted = false };
  }, []); // eslint-disable-line
}

export function useIsMounted() {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false };
  }, []);

  return isMounted;
}

export function IsValid(obj: any) {
  return Object.keys(obj).length !== 0
}

export function IsValidDate(obj: any) {
  return Object.keys(obj).length !== 0 && obj.toLocaleString() !== 'Invalid Date'
}

export function copyToClipboard(text: string, toast='Copied to clipboard') {
  var textField = document.createElement('textarea')
  textField.value = text
  document.body.appendChild(textField)
  textField.select()
  document.execCommand('copy')
  textField.remove()
  if(toast) toastInfo(toast)
}

export const showNotification = (text: string, options: NotificationOptions = {}) => {
  // console.log(`notifying: ${text}`)
  // console.log(`permisions: ${Notification.permission}`)

  // Let's check if the browser supports notifications
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
  }

  // Let's check whether notification permissions have alredy been granted
  else if (Notification.permission === "granted") {
    // If it's okay let's create a notification
    var notification = new Notification(text, options)  // eslint-disable-line
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission(function (permission) {
      // If the user accepts, let's create a notification
      if (permission === "granted") {
        var notification = new Notification(text, options)  // eslint-disable-line
      }
    });
  }
}