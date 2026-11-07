import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groundedCandidates,researchQuery,withinDomain,preferredResearchSources} from '../lib/research-candidates';
const url='https://official.example/team',text='PT Example operates in Jakarta. Jane Example — Operations Manager — jane@official.example. Product knowledge.',source={url,text},person={kind:'pic',source_url:url,name:'Jane Example',title:'Operations Manager',email:'jane@official.example',industry:'',location:'Jakarta',evidence:'Jane Example — Operations Manager — jane@official.example.',official_company_site:true};
test('named PIC output must have exact public evidence, role, company domain and published email',()=>{
 const result=groundedCandidates({candidates:[person]},[source],'pic','official.example');assert.equal(result.length,1);assert.equal(result[0].email,'jane@official.example');assert.equal(result[0].location,'Jakarta');
 for(const changed of [{...person,name:'Invented Person'},{...person,title:'CEO'},{...person,email:'guessed@official.example'},{...person,source_url:'https://foreign.example/team'},{...person,evidence:'Jane Example is CEO'},{...person,official_company_site:false}])assert.deepEqual(groundedCandidates({candidates:[changed]},[source],'pic','official.example'),[]);
 assert.deepEqual(groundedCandidates({candidates:[person]},[source],'pic','other.example'),[]);
 const noEmail=groundedCandidates({candidates:[{...person,email:''}]},[source],'pic','official.example');assert.equal(noEmail[0].email,'');
 const omitted={name:person.name,title:person.title,evidence:person.evidence};assert.equal(groundedCandidates({kind:'pic',candidates:[omitted]},[source],'pic','official.example')[0].source_url,url);
 assert.deepEqual(groundedCandidates({candidates:[{...omitted,evidence:'Unsupported quote'}]},[source],'pic','official.example'),[]);
 assert.deepEqual(groundedCandidates({candidates:[{...person,name:'!!'}]},[source],'pic','official.example'),[]);
 assert.deepEqual(groundedCandidates({candidates:[{...person,title:'@@'}]},[source],'pic','official.example'),[]);
 const bracketed={...person,email:'guessed@official.example',evidence:'Jane Example Operations Manager <guessed@official.example>'};assert.deepEqual(groundedCandidates({candidates:[bracketed]},[{url,text:'Jane Example Operations Manager'}],'pic','official.example'),[]);
});
test('company names are grounded, domain comes from source and unsupported metadata is omitted',()=>{
 const company={...person,kind:'company',name:'PT Example',evidence:'PT Example operates in Jakarta.',industry:'Invented industry',location:'Unknown city',email:'',title:''};
 const result=groundedCandidates({candidates:[company,company]},[source],'company');assert.equal(result.length,1);assert.equal(result[0].domain,'official.example');assert.equal(result[0].industry,'');assert.equal(result[0].location,'');
 assert.equal(withinDomain('https://official.example.evil.example/team','official.example'),false);assert.equal(withinDomain('https://www.official.example/team','official.example'),true);
 assert.deepEqual(groundedCandidates({candidates:[person]},[source],'company'),[]);
});
test('search uses target or explicit keywords and keeps PIC scope bound to selected company',()=>{
 const product={industry:'Hotel',buyer_roles:'Operations Manager'},icp={industry:'Hospitality',location:'Jakarta',buyer_roles:'General Manager'};
 assert.match(researchQuery('company','',product,icp),/Hospitality Jakarta/);assert.equal(researchQuery('company','Astra official',product,icp),'Astra official');assert.equal(researchQuery('pic','',product,icp,'official.example'),'site:official.example General Manager');assert.equal(researchQuery('pic','director',product,icp,'official.example'),'site:official.example director');
});
test('PIC extraction prefers direct team profiles over historical press releases and keeps role text grounded',()=>{
 const profile={url:'https://official.example/en/board-of-directors',text:'Rudy\nPRESIDENT DIRECTOR'},old={url:'https://official.example/press-release/2020-board',text:'Former leader'};
 assert.deepEqual(preferredResearchSources([old,profile],'pic'),[profile]);assert.deepEqual(preferredResearchSources([old],'pic'),[old]);
 const c={...person,name:'Rudy',title:'President Director',email:'',evidence:'Rudy — Presiden Direktur',source_url:url};assert.equal(groundedCandidates({candidates:[c]},[{url,text:'Rudy — Presiden Direktur'}],'pic','official.example')[0].title,'Presiden Direktur');
 const linked={...person,email:'',evidence:'Jane Example Operations Manager'};assert.equal(groundedCandidates({candidates:[linked]},[{url,text:'[Jane Example](https://official.example/bio) **Operations Manager**'}],'pic','official.example').length,1);
});
test('company profile and fit require independent company and offered-product evidence',()=>{
 const c={...person,kind:'company',name:'PT Example',title:'',email:'',evidence:'PT Example operates in Jakarta.',profile_quote:'PT Example operates in Jakarta.',fit_reasons:[{product_quote:'Manage billing and smart rooms',company_quote:'PT Example operates in Jakarta.',reason:'Potensi dukungan operasi perlu dikonfirmasi.'}]};
 const facts=[{id:'product.value_proposition',title:'Offer',text:'Manage billing and smart rooms'}];
 const valid=groundedCandidates({candidates:[c]},[source],'company',undefined,facts)[0];assert.equal(valid.fit_reasons?.length,1);assert.equal(valid.profile_quote,c.profile_quote);
 assert.equal(groundedCandidates({candidates:[c]},[source],'company',undefined,[{...facts[0],text:'Unrelated product facts'}])[0].fit_reasons?.length,0);
 assert.equal(groundedCandidates({candidates:[{...c,profile_quote:'Invented business',fit_reasons:[{...c.fit_reasons[0],company_quote:'Invented corporate business'}]}]},[source],'company',undefined,facts)[0].fit_reasons?.length,0);
});
test('external business sources require the selected company, person and role in the same quote',()=>{
 const external={url:'https://news.example/story',text:'Jane Example is Operations Manager at PT Example.'},c={...person,source_url:external.url,email:'',official_company_site:false,evidence:external.text};
 assert.equal(groundedCandidates({candidates:[c]},[external],'pic','official.example',[],'PT Example',true).length,1);
 assert.deepEqual(groundedCandidates({candidates:[c]},[external],'pic','official.example',[],'Different Company',true),[]);
 assert.deepEqual(groundedCandidates({candidates:[c]},[external],'pic','official.example'),[]);
});
