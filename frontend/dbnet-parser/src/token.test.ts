import { Tokenize, TokenizeLine } from "./token";
import { parse } from 'yaml'
import { ParseTableName } from "./schemata";

const testFolder = 'src/test_files/';
const fs = require('fs');

// get results
const results = parse(fs.readFileSync(`${testFolder}/results.yaml`, 'utf8'))

fs.readdirSync(testFolder).forEach((file: string) => {
  if(!file.includes('.sql')) return
  const path = `${testFolder}${file}`
  const testNum = parseInt(file.replace('.sql', ''))
  // if(testNum > 2 ) return
  // if(testNum !== 9 ) return
  // return
  test('test ' + path, () => {
    const query = fs.readFileSync(path, 'utf8');
    let body = Tokenize(query)
    // console.log(body.tokens.map(t => t.value))
    let expected = results.summary[testNum]
    expect(body.text).toEqual(query);
    expect(body.tokens.length).toEqual(expected.tokens);
  });
});

test('test tokenize body 1', () => {
  const query = `
  select *, col as col2 ,account_id::varchar,
    'event cool' as type,
    sum((num_events) ) as num_events
  -- this is a comment
  /*
  another comment*/
  from "schema 1"."events"
  LeFt join analytics.production.accounts a on a.id = events.account_id::varchar
  where col in (select 1 from test2) and c1 >= c2
  {{ jinja code }}
     ;`
  let body = Tokenize(query)
  // console.log(body.tokens[37])
  // console.log(body.tokens.map(t => t.value))
  // console.log(body.tokens.map((t, i) => `${t.value} => ${t.parenthesisLevel}`))
  // console.log(body.tokens.map((t, i) => `${i} => ${t.value}`))
  expect(body.text).toEqual(query);
  expect(body.tokens.length).toEqual(85);
  expect(body.tokens[34].value).toEqual('-- this is a comment');
  expect(body.tokens[34].isComment).toEqual(true);
  expect(body.tokens[36].value).toEqual('/*\n  another comment*/');
  expect(body.tokens[82].value).toEqual('{{ jinja code }}');
  expect(body.tokens[82].isJinja).toEqual(true);
});

test('test tokenize line 1', () => {
  const query = `LeFt join analytics."production".accounts a on a.id = events.account_id::varchar /* account_id_old */`
  let body = TokenizeLine(query)
  // console.log(body.tokens.map(t => t.value))
  // console.log(body.tokens.map(t => `${t.value} => ${t.parenthesisLevel}`))
  expect(body.text).toEqual(query);
  expect(body.tokens.length).toEqual(21);
  expect(body.tokens[0].value).toEqual('LeFt');
  expect(body.tokens[0].isWord).toEqual(true);
  expect(body.tokens[1].value).toEqual(' ');
  expect(body.tokens[1].isWord).toEqual(false);
  expect(body.tokens[1].isOperator).toEqual(false);
  expect(body.tokens[1].isWhitespace).toEqual(true);
  expect(body.tokens[1].isWord).toEqual(false);
  expect(body.tokens[1].isOperator).toEqual(false);
  expect(body.tokens[12].value).toEqual('=');
  expect(body.tokens[12].isOperator).toEqual(true);
  expect(body.tokens[12].isWord).toEqual(false);
});

test('test table name parse', () => {
  let table = ParseTableName('analytics."production".accounts')
  expect(table.database).toEqual('analytics');
  expect(table.schema).toEqual('production');
  expect(table.name).toEqual('accounts');

  table = ParseTableName('analytics."production nice".accounts', 'snowflake')
  expect(table.database).toEqual('ANALYTICS');
  expect(table.schema).toEqual('production nice');
  expect(table.name).toEqual('ACCOUNTS');

  table = ParseTableName('analytics.`produc Tion`.accounts', 'bigquery')
  expect(table.database).toEqual('analytics');
  expect(table.schema).toEqual('produc Tion');
  expect(table.name).toEqual('accounts');
});
