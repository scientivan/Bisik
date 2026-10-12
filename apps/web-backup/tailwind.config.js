export default {
 content:['./index.html','./src/**/*.{ts,tsx}'],
 theme:{extend:{
 colors:{bone:'#F3F2EC',sheet:'#FBFAF6',frame:'#E8E7DF',rule:'#DCDBD2','rule-soft':'#E6E5DD','grid-line':'#E6E5DC',ink:'#111318','ink-soft':'#2B2E36','hatch-light':'#C9C8BF',ultramarine:'#2A2FD0','ultramarine-deep':'#1B1F96','ultramarine-mid':'#6E72E6','ultramarine-pale':'#B9BCF3','on-ultramarine':'#E9EAFB',amber:'#FFB547','dark-row':'#1E2129'},
 borderRadius:{pill:'999px',frame:'18px',panel:'12px',control:'12px',row:'9px',bar:'6px'},
 spacing:{'frame-inset':'8px',panel:'18px',card:'24px',section:'120px',gutter:'32px'},
 fontFamily:{sans:["-apple-system","BlinkMacSystemFont","SF Pro Display","SF Pro Text","Inter","Helvetica Neue","sans-serif"]},
 fontSize:{display:['80px',{lineHeight:'.98',letterSpacing:'-.04em',fontWeight:'700'}],headline:['52px',{lineHeight:'1.02',letterSpacing:'-.035em',fontWeight:'700'}],title:['24px',{lineHeight:'1.2',letterSpacing:'-.02em',fontWeight:'700'}],body:['17px',{lineHeight:'1.5',fontWeight:'500'}],label:['14px',{lineHeight:'1.3',fontWeight:'700'}],numeral:['76px',{lineHeight:'.9',letterSpacing:'-.045em',fontWeight:'800'}]}
 }},plugins:[]
};
