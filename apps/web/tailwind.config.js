export default {
 content:['./index.html','./src/**/*.{ts,tsx}'],
 theme:{extend:{
 colors:{bone:'#F7F7F7',sheet:'#FFFFFF',frame:'#EDEDED',rule:'#D9D9D9','rule-soft':'#E5E5E5',ink:'#0F0F0F','ink-soft':'#555555','hatch-light':'#A9A9A9',ultramarine:'#1E1E1E','ultramarine-deep':'#1E1E1E','ultramarine-mid':'#777777','ultramarine-pale':'#BBA9F5','on-ultramarine':'#F7F7F7',amber:'#FFB547','dark-row':'#282828'},
 borderRadius:{pill:'8px',frame:'28px',panel:'24px',control:'16px',row:'12px',bar:'6px'},
 spacing:{'frame-inset':'0px',panel:'32px',card:'30px',section:'160px',gutter:'64px'},
 fontFamily:{sans:["DieGrotesk","Arial","sans-serif"],data:["ABCDiatype","Arial","sans-serif"]},
 fontSize:{display:['108px',{lineHeight:'1.02',letterSpacing:'-.04em',fontWeight:'400'}],headline:['64px',{lineHeight:'1.06',letterSpacing:'-.03em',fontWeight:'400'}],title:['28px',{lineHeight:'1.15',letterSpacing:'-.02em',fontWeight:'400'}],body:['18px',{lineHeight:'1.5',fontWeight:'400'}],label:['14px',{lineHeight:'1.3',fontWeight:'400'}],numeral:['88px',{lineHeight:'1',letterSpacing:'-.04em',fontWeight:'400'}]}
 }},plugins:[]
};
