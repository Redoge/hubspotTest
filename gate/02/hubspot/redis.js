const redis = require("redis");
const rconf = require('../../../../servconf').redis;
const rconf_1 = require('../../../../servconf').redis_1;

const { promisify } = require('util');
// client = redis.createClient(rconf.port, rconf.host);
// const getAsync = promisify(client.get).bind(client);
// const setAsync = promisify(client.set).bind(client);
// const keysAsync = promisify(client.keys).bind(client);
// const expireAsync = promisify(client.expire).bind(client);

exports.get_key_i_v2  = async (data) => {
    let info ={"event":null,"type":null,"from":null,"to":null,"via":null,"time_start":null,"transfer":null,"was_transfer":null,"transfer_with":null,"answer":null,"sessionid":null,"callid":null,"additionally":null};
    // проверка событий

    let f_key = null;
    let f_key_data = null;
    let forward_in_filter = [9393];

    let to_new = null;
    let from_new = null;
    let via_new = null;

    ch_trans = async (e_r,e_s)=>{
        //  console.log('-------------',e_s);

        let trans = {"transfer":null, "was_transfer":null,"transfer_with":null};

        //  if(e_s.a_marker==='')
        //  let  t_key = await this.get_t_key_v2(e_s);
        let  t_key = await this.get_key_v2(e_s,'transfer',e_s.sessionid,'*');
        let  r_key = await this.get_keys_v2(e_s,'ring','*',e_s.sessionid);
        let  a_key = await this.get_keys_v2(e_s,'answer','*',e_s.sessionid);
        // console.log(' -=- ch_trans a_key ',a_key);

        if ((t_key)&&((e_r.callerid===e_s.callerid)&&(e_r.calleeid===e_s.calleeid))){
//         console.log('-- next transfer ( cre new t_key )--',t_key);
            trans.transfer=1;
            trans.was_transfer=1;
            return trans;

        }else if(t_key) {
//          console.log(' ring was transfer ');
            trans.transfer=null;
            trans.was_transfer=1;
            return  trans;

        } else if((e_r.callerid===e_s.callerid)&&(e_r.calleeid===e_s.calleeid)&&(e_s.a_marker==='start_in')) {
            // console.log('first transfer');
            let key_1 = e_s.app +':'+ e_s.company_id + ':transfer:' + e_s.sessionid+ ':1';
            await this.cre_t_key(key_1,JSON.stringify(e_r));
            trans.transfer=1;
            trans.was_transfer=null;
            return  trans;
        } else if(r_key&&(r_key.length>1)&&(e_s.a_marker==='start_out')){
            trans.transfer_with=1;
            return  trans;
        } else if(a_key&&(a_key.length>0)&&(e_s.a_marker==='start_in')&&(e_r.a_marker==='ring')){
            console.log('in ring tr_with ');

            trans.transfer_with=1;
            return  trans;

        }
        else if(a_key&&(a_key.length>1)&&(e_s.a_marker==='start_in')&&(e_r.a_marker==='answer')){
            trans.transfer_with=a_key.length;
            return  trans;
        }
        else if(a_key&&(a_key.length>1)&&(e_s.a_marker==='start_in')&&(e_r.a_marker==='hangup')){
            //   console.log('hangup a 1 and ring = ',r_key.length);

            trans.transfer_with=a_key.length;
            return  trans;
        }
            // else if(a_key&&(a_key.length===1)&&(e_s.a_marker==='start_in')&&(e_r.a_marker==='hangup')){
            //         console.log('hangup a 1 and ring = ',r_key.length);

            //      trans.transfer_with=a_key.length;
            //      return  trans;

        // }
        else
        {
            return  trans;
        }

    }

    if(data.a_marker==='start_out'){
        let ch_r = await ch_trans(data,data);
        return  ch_r;

    } else if(data.a_marker==='start_in'){

    }
    else if (data.a_marker==='ring'){



        console.log('=1=voip_events_ring_data ',JSON.stringify(data));
        let s_data_in = await this.get_key_data(data.app +':'+ data.company_id + ':start_in:' + data.sessionid+':'+ data.sessionid);
        let s_data_out = await this.get_key_data(data.app +':'+ data.company_id + ':start_out:' + data.sessionid+':'+ data.sessionid);
        // ami_sip:2942:1577956253.695997:start_in:1577956253.695997

        if(s_data_in ){
            f_key_in = await this.get_key_v2(JSON.parse(s_data_in),'forward',(data.callerid).slice(-9)+':*',JSON.parse(s_data_in).sessionid);
            f_key_in_calleeid = await this.get_key_v2(JSON.parse(s_data_in),'forward',(data.calleeid).slice(-9)+':*',JSON.parse(s_data_in).sessionid);
            f_key = (f_key_in)? f_key_in : (f_key_in_calleeid)? f_key_in_calleeid : null;
            f_key_data = JSON.parse(await this.get_key_data(f_key));
            console.log('voip_events f_key_data ',f_key_data);
        }

        if (s_data_in) {
            let ch_r = await ch_trans(data,JSON.parse(s_data_in));

            if (ch_r.transfer){
                // трансвер делает дубль. отсылает  s_data_out
                console.log(' -- in ring transfer data',JSON.stringify(data));
                // console.log(' -- out ring transfer s_data_out', s_data_out);
                return null;
            }
            else if (ch_r.was_transfer||ch_r.transfer_with){
                let  a_key = await this.get_key_v2(JSON.parse(s_data_in),'answer','*',JSON.parse(s_data_in).sessionid);
                let  a_keys = await this.get_keys_v2(JSON.parse(s_data_in),'answer','*',JSON.parse(s_data_in).sessionid);

                if ((a_key)&&(a_keys.length<2)){
                    let a_key_d = await this.get_key_data(a_key);
                    console.log('voip_events in_ring_1 f_key_data ',f_key_data);

                    if(forward_in_filter.includes(data.company_id)&&f_key_data){
                        to_new = f_key_data.line_from;
                        from_new = f_key_data.income_from;
                        via_new = f_key_data.num_via;
                    }

                    //     console.log('---= ring in ch_r ',ch_r);
                    //  console.log('---= ring in s_data_in ',s_data_in);
                    //  console.log('---= ring in a_key_d ',a_key_d);
                    //  console.log('---= ring in was_transfer||transfer_with data ',JSON.stringify(data));

                    info.event="StartCall";
                    info.type='in';
                    info.time_start=JSON.parse(s_data_in).time;
                    info.event_time=data.time;
                    info.transfer=null;
                    info.was_transfer=ch_r.was_transfer;
                    info.transfer_with=ch_r.transfer_with;

                    info.from= (from_new)? from_new : data.callerid;
                    info.to= (to_new)? to_new : data.channel.split(/-|@/)[0].replace(/SIP\/|GSM_|Local\//g, '');
                    info.via= (via_new)? via_new : JSON.parse(a_key_d).channel.split(/-|@/)[0].replace(/SIP\/|GSM_|Local\//g, '');

                    // info.from=data.callerid;
                    // info.to=data.channel.split(/-|@/)[0].replace(/SIP\/|GSM_|Local\//g, '');
                    info.via=JSON.parse(a_key_d).channel.split(/-|@/)[0].replace(/SIP\/|GSM_|Local\//g, '');

                    // JSON.parse(s_data_in).calleeid;
                    // ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                    // JSON.parse(s_data_out).calleeid;
                    info.sessionid=JSON.parse(s_data_in).sessionid;
                    info.callid=data.channelid;
                    info.join= JSON.parse(s_data_in).join;

                    console.log('voip_events in_ring_1 info ',JSON.stringify(info));
                    return info;

                }else{
                    console.log('voip_events in_ring_2 null |more then 2 answer| ',JSON.stringify(data));
                    return null;
                }




            }else{

                // voip_events f_key_data  {
                //   num_via: '40752118096',
                //   income_from: '+40737104510',
                //   num_to: '40746622054',
                //   line_from: '80046910205'
                // }


                if(forward_in_filter.includes(data.company_id)&&f_key_data){
                    to_new = f_key_data.line_from;
                    from_new = f_key_data.income_from;
                    via_new = f_key_data.num_via;
                }
                //      console.log('---= ring in ch_r ',ch_r);
                //   console.log('---= ring in s_data_in ',s_data_in);
                //  console.log('---= ring in data ',JSON.stringify(data));
                //  console.log('voip_events in_ring_2 f_key_data ',f_key_data);
                info.event="StartCall";
                info.type='in';
                info.time_start=JSON.parse(s_data_in).time;
                info.event_time=data.time;
                info.transfer=null;
                info.was_transfer=ch_r.was_transfer;

                info.from= (from_new)? from_new : data.callerid;
                info.to= (to_new)? to_new : data.realcalleeid;
                info.via= (via_new)? via_new : JSON.parse(s_data_in).calleeid;

                // info.from=data.callerid;
                // info.to=data.realcalleeid;
                // info.via=JSON.parse(s_data_in).calleeid;

                // ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                // JSON.parse(s_data_out).calleeid;
                info.sessionid=JSON.parse(s_data_in).sessionid;
                info.callid=data.channelid;
                info.join= JSON.parse(s_data_in).join;
                console.log('voip_events in_ring_3 info ',JSON.stringify(info));
                return info;
            }



            return info;
        } else if (s_data_out){
            let c_filter_ch_r = [8005,7588];

            let n_from = null;
            let n_to = null;
            let n_via = null;
            let filter_calli = [7996,8005,6366,3444,8656,8461,3177,7588,9393,9421,9393];
            if(filter_calli.includes(data.company_id)&&(data.channel.includes('SIP/Callii'))){
                console.log('=1=voip_events_out ring in filter_calli data',JSON.stringify(data));
                n_from = (JSON.parse(s_data_out).a_marker=='ClickToCall')? JSON.parse(s_data_out).calleeid : JSON.parse(s_data_out).callerid ;
                n_to = (JSON.parse(s_data_out).a_marker=='ClickToCall')? JSON.parse(s_data_out).callerid : JSON.parse(s_data_out).calleeid ;
                n_via = (JSON.parse(s_data_out).a_marker=='ClickToCall')? data.callerid : data.callerid;

            }

            if(JSON.parse(s_data_out).a_marker=='ClickToCall'){ info.additionally="api_c2c";}
            //   console.log('=2=voip_events_s_data_out '+s_data_out);
            //   console.log('---= ring out ',JSON.stringify(data));
            //   console.log('---= ring s_data_out',s_data_out);
            let ch_r = await ch_trans(data,JSON.parse(s_data_out));
            //   console.log('=3=voip_events_ch_r '+JSON.stringify(ch_r));
            if (ch_r.transfer){
                // трансвер делает дубль. отсылает  s_data_out
                console.log('voip_events out_ring_1 null |transfer|',JSON.stringify(data));
                // console.log(' -- out ring transfer s_data_out', s_data_out);
                return null;
            }
            else if ((ch_r.was_transfer||ch_r.transfer_with)&&(!c_filter_ch_r.includes(data.company_id))){

                info.event="StartCall";
                info.type='out';
                info.time_start=JSON.parse(s_data_out).time;
                info.event_time=data.time;
                info.transfer=null;
                info.was_transfer=ch_r.was_transfer;
                info.from = data.callerid;
                info.to = await this.filter_sharp(data.calleeid);
                info.via = s_data_out.callerid;
                info.sessionid=JSON.parse(s_data_out).sessionid;
                info.callid=data.channelid;
                console.log('voip_events out_ring_2 null |w_transfer|',JSON.stringify(data));
                return null;
            }
            else {

                console.log('=4=voip_events_out ring data ',JSON.stringify(data));
                console.log('=4=voip_events_out ring s_data_out ',s_data_out);

                info.event="StartCall";
                info.type='out';
                info.time_start=JSON.parse(s_data_out).time;
                info.event_time=data.time;
                info.transfer=null;
                info.was_transfer=ch_r.was_transfer;
                info.from= (n_from)? n_from : data.callerid;
                info.to= (n_to)? n_to : data.realcalleeid;
                info.via= (n_via)? n_via : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                info.sessionid=JSON.parse(s_data_out).sessionid;
                info.callid=data.channelid;
                console.log('voip_events out_ring_3 info ',JSON.stringify(info));
                return info;

            }

        }else {
            console.log('voip_events out_ring_4 info |ring ather |(null) ',JSON.stringify(info));
            console.log('voip_events out_ring_4 data |ring ather | ',JSON.stringify(data));
            return info;
        }

    } else if(data.a_marker==='answer'){
        // ami_sip:2942:ring:1577450525.3681855:1577450525.3681851

        let a_r_key = await this.get_key_v2(data,'ring',data.uniqueid,'*');
        if (a_r_key) {
            let a_r_data = await this.get_key_data(a_r_key);
            let sess = a_r_key.split(data.uniqueid+':')[1]
            let s_data_in = await this.get_key_data(data.app +':'+ data.company_id + ':start_in:' + sess+':'+ sess);
            let s_data_out = await this.get_key_data(data.app +':'+ data.company_id + ':start_out:' + sess+':'+ sess);

            if(s_data_in){
                let ch_r = await ch_trans(data,JSON.parse(s_data_in));
                // JSON.parse(a_r_data)
                // console.log('voip_events in_answer data.channel ',((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, ''));

                if(s_data_in ){
                    //  f_key_in = await this.get_key_v2(JSON.parse(s_data_in),'forward',(data.calleridnum).slice(-9)+':*',JSON.parse(s_data_in).sessionid);
                    f_key_in = await this.get_key_v2(JSON.parse(s_data_in),'forward','*',JSON.parse(s_data_in).sessionid);
                    f_key_in_calleeid = await this.get_key_v2(JSON.parse(s_data_in),'forward',(data.calleridname).slice(-9)+':*',JSON.parse(s_data_in).sessionid);
                    f_key = (f_key_in)? f_key_in : (f_key_in_calleeid)? f_key_in_calleeid : null;
                    f_key_data = JSON.parse(await this.get_key_data(f_key));
                    //   console.log('voip_events f_key_data ',f_key_data);
                }

                if(forward_in_filter.includes(data.company_id)&&f_key_data){
                    to_new = f_key_data.line_from;
                    from_new = f_key_data.income_from;
                    via_new = f_key_data.num_via;
                }

                if (ch_r.transfer||ch_r.was_transfer||ch_r.transfer_with){
                    let a_pp_key = await this.get_key_pp_v2(data,'answer',data.uniqueid,sess);
                    if(a_pp_key){
                        let a_pp_data = await this.get_key_data(a_pp_key);
                        //         console.log('-=- in answer pp key ',a_pp_key);
                        //           console.log('---= answer in ch_r ',ch_r);
                        //   console.log('---= answer in s_data_in ',s_data_in);
                        //   console.log('---= answer in a_r_data ',a_r_data);
                        //   console.log('---= answer in a_pp_data ',a_pp_data);
                        //   console.log('---= answer in data ',JSON.stringify(data));


                        info.event="Answer";
                        info.type='in';
                        info.time_start=JSON.parse(s_data_in).time;
                        info.time_ring=JSON.parse(a_r_data).time;
                        info.event_time=data.time;
                        info.transfer=ch_r.transfer;
                        info.was_transfer=ch_r.was_transfer;
                        info.transfer_with=ch_r.transfer_with;
                        info.from= (from_new)? from_new : data.calleridnum;
                        info.to= (to_new)? to_new : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                        info.via= (via_new)? via_new : (((JSON.parse(a_pp_data)).channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                        info.sessionid=JSON.parse(s_data_in).sessionid;
                        info.callid=data.uniqueid;
                        info.answer=1;
                        info.join= JSON.parse(s_data_in).join;
                        console.log('voip_events in_answers_1 info ',JSON.stringify(info));
                        return info;
                    }else{
                        console.log('voip_events in_answers_2 null ',JSON.stringify(data));
                        return null;
                    }

                }else {
                    info.event="Answer";
                    info.type='in';
                    info.time_start=JSON.parse(s_data_in).time;
                    info.time_ring=JSON.parse(a_r_data).time;
                    info.event_time=data.time;
                    info.transfer=null;
                    info.was_transfer=null;
                    info.transfer_with=null;
                    info.from= (from_new)? from_new : data.calleridnum;
                    info.to= (to_new)? to_new : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                    info.via= (via_new)? via_new : JSON.parse(s_data_in).calleeid;
                    info.sessionid=JSON.parse(s_data_in).sessionid;
                    info.callid=data.uniqueid;
                    info.answer=1;
                    info.join= JSON.parse(s_data_in).join;
                    console.log('voip_events in_answers_3 info ',JSON.stringify(info));
                    return info;

                    //  return null;
                }
            }
            else if (s_data_out){
                let n_from = null;
                let n_to = null;
                let n_via = null;
                let filter_calli = [7996,8005,8656,3444,8461,3177,7588,9393,9421];
                if(filter_calli.includes(data.company_id)&&(data.channel.includes('SIP/Callii'))){
                    n_from = (JSON.parse(s_data_out).a_marker=='ClickToCall')? JSON.parse(s_data_out).calleeid : JSON.parse(s_data_out).callerid ;
                    n_to = (JSON.parse(s_data_out).a_marker=='ClickToCall')? JSON.parse(s_data_out).callerid : JSON.parse(s_data_out).calleeid ;
                    n_via = JSON.parse(a_r_data).callerid;
                }

                if(JSON.parse(s_data_out).a_marker=='ClickToCall'){ info.additionally="api_c2c";}

                let ch_r = await ch_trans(JSON.parse(a_r_data),JSON.parse(s_data_out));
                if ((ch_r.transfer||ch_r.was_transfer||ch_r.transfer_with)&&JSON.parse(s_data_out).sessionid==data.uniqueid){
                    console.log('voip_events out_answers_1 null |was ch_r.transfer||ch_r.was_transfer||ch_r.transfer_with|',JSON.stringify(data));
                    return null;
                }else {
                    //    console.log('---= answer s_data_out ',s_data_out);
                    //   console.log('---= answer a_r_data ',a_r_data);
                    //   console.log('---= answer out data ',JSON.stringify(data));
                    info.event="Answer";
                    info.type='out';
                    info.time_start=JSON.parse(s_data_out).time;
                    info.time_ring=JSON.parse(a_r_data).time;
                    info.event_time=data.time;
                    info.transfer=null;
                    info.was_transfer=null;
                    info.transfer_with=null;
                    info.from= (n_from)? n_from : JSON.parse(a_r_data).callerid;
                    info.to= (n_to)? n_to : await this.filter_sharp(JSON.parse(a_r_data).realcalleeid);
                    info.via= (n_via)? n_via : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                    info.sessionid=JSON.parse(s_data_out).sessionid;
                    info.callid=data.uniqueid;
                    info.answer=1;
                    console.log('voip_events out_answers_2 info ',JSON.stringify(info));
                    return info;

                }

            }else {
                console.log('voip_events answers_3 NULL |ring is no s_data_in || s_data_out|',JSON.stringify(data));
                return null;
            }
            // let key = data.app +':'+ data.company_id + ':' + data.a_marker + ':' + data.uniqueid+':'+k_r.split(data.uniqueid+':')[1];


        }
        else {
            console.log('voip_events answers_4 NULL |answer no ring key|',JSON.stringify(data));
            return null;
        }


    } else if(data.a_marker==='hangup'){
        // ждем сдр при сбросе оператором
        await new Promise(resolve => setTimeout(resolve, 500));

        let h_r_key = await this.get_key_v2(data,'ring',data.uniqueid,'*');
        console.log('voip_events in_hangup start ',h_r_key);
        console.log('voip_events in_hangup data ',data);
        console.log('voip_events in_hangup data.channel ',((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, ''));




        if (h_r_key) {
            let h_r_data = await this.get_key_data(h_r_key);
            let sess = h_r_key.split(data.uniqueid+':')[1]
            let h_h_keys = await this.get_keys_v2(data,'hangup','*',sess);
            let s_data_in = await this.get_key_data(data.app +':'+ data.company_id + ':start_in:' + sess+':'+ sess);
            let s_data_out = await this.get_key_data(data.app +':'+ data.company_id + ':start_out:' + sess+':'+ sess);

            if(s_data_in){
                let ch_r = await ch_trans(data,JSON.parse(s_data_in));
                let h_a_key = await this.get_key_data(data.app +':'+ data.company_id + ':answer:' +data.uniqueid+':'+ sess);
                let h_a_keys = await this.get_keys_v2(data,'answer','*',sess);
                // console.log('voip_events in_hangup ch_r ',ch_r);
                if(s_data_in ){
                    //  f_key_in = await this.get_key_v2(JSON.parse(s_data_in),'forward',(data.calleridnum).slice(-9)+':*',JSON.parse(s_data_in).sessionid);
                    f_key_in = await this.get_key_v2(JSON.parse(s_data_in),'forward','*',JSON.parse(s_data_in).sessionid);
                    f_key_in_calleeid = await this.get_key_v2(JSON.parse(s_data_in),'forward',(data.calleridname).slice(-9)+':*',JSON.parse(s_data_in).sessionid);
                    f_key = (f_key_in)? f_key_in : (f_key_in_calleeid)? f_key_in_calleeid : null;
                    f_key_data = JSON.parse(await this.get_key_data(f_key));
                    //  console.log('voip_events f_key_data ',f_key_data);
                }

                if(forward_in_filter.includes(data.company_id)&&f_key_data){
                    to_new = f_key_data.line_from;
                    from_new = f_key_data.income_from;
                    via_new = f_key_data.num_via;
                }

                if (ch_r.transfer||ch_r.was_transfer||ch_r.transfer_with){
                    if(h_a_keys.length<3){

                        if(h_a_key){
                            let a_pp_key = await this.get_key_pp_v2(data,'answer',data.uniqueid,sess);
                            if(a_pp_key){
                                let a_pp_data = await this.get_key_data(a_pp_key);
                                //    console.log('---= hangup in A h_a_key ',h_a_key);
                                //     console.log('---= hangup in A a_pp_data ',a_pp_data);
                                if(JSON.parse(h_a_key).time>JSON.parse(a_pp_data).time){
                                    //        console.log('voip_events in_hangup_1 in ');
                                    // console.log('-=- last h a');
                                    // console.log('---= hangup in A a_pp_data ',a_pp_data);
                                    // console.log('---= hangup in  A data ',JSON.stringify(data));
                                    info.event="Hangup";
                                    info.type='in';
                                    info.time_start=JSON.parse(s_data_in).time;
                                    info.time_ring=JSON.parse(h_r_data).time;
                                    info.time_answer=(h_a_key)?JSON.parse(h_a_key).time:null;
                                    info.event_time=data.time;
                                    info.transfer=ch_r.transfer;
                                    info.was_transfer=ch_r.was_transfer;
                                    info.transfer_with=ch_r.transfer_with;
                                    info.from= (from_new)? from_new : data.calleridnum;
                                    info.to= (to_new)? to_new : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                                    info.via= (via_new)? via_new : ((JSON.parse(a_pp_data).channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                                    info.sessionid=JSON.parse(s_data_in).sessionid;
                                    info.callid=data.uniqueid;
                                    info.answer=(h_a_key)?1:null;
                                    info.join = JSON.parse(s_data_in).join;
                                    info.end_sess = JSON.parse(s_data_in).end_sess;
                                    console.log('voip_events in_hangup_1 info ',JSON.stringify(info));
                                    return info;


                                }
                                else{
                                    // console.log('voip_events in_hangup_2 in ');
                                    // console.log('-=- no last ha');
                                    // console.log('---= hangup in  A data ',JSON.stringify(data));
                                    info.event="Hangup";
                                    info.type='in';
                                    info.time_start=JSON.parse(s_data_in).time;
                                    info.time_ring=JSON.parse(h_r_data).time;
                                    info.time_answer=(h_a_key)?JSON.parse(h_a_key).time:null;
                                    info.event_time=data.time;
                                    info.transfer=ch_r.transfer;
                                    info.was_transfer=ch_r.was_transfer;
                                    info.transfer_with=ch_r.transfer_with;
                                    info.from= (from_new)? from_new : data.calleridnum;
                                    info.to= (to_new)? to_new : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                                    info.via= (via_new)? via_new : JSON.parse(s_data_in).calleeid;
                                    info.sessionid=JSON.parse(s_data_in).sessionid;
                                    info.callid=data.uniqueid;
                                    info.answer=(h_a_key)?1:null;
                                    info.join= JSON.parse(s_data_in).join;
                                    info.end_sess = JSON.parse(s_data_in).end_sess;
                                    console.log('voip_events in_hangup_2 info ',JSON.stringify(info));
                                    return info;

                                }

                            }else{
                                //    console.log('voip_events in_hangup_3 in ');
                                //     console.log('---= hangup in no A h_h_keys ',h_h_keys);
                                //     console.log('---= hangup in no A s_data_in ',s_data_in);
                                //     console.log('---= hangup in  A h_r_data ',h_r_data);
                                //     console.log('---= hangup in  A ch_r ',ch_r);
                                //     console.log('---= hangup in A h_a_key ',h_a_key);
                                //    console.log('---= hangup in  A data ',JSON.stringify(data));
                                info.event="Hangup";
                                info.type='in';
                                info.time_start=JSON.parse(s_data_in).time;
                                info.time_ring=JSON.parse(h_r_data).time;
                                info.time_answer=(h_a_key)?JSON.parse(h_a_key).time:null;
                                info.event_time=data.time;
                                info.transfer=ch_r.transfer;
                                info.was_transfer=ch_r.was_transfer;
                                info.transfer_with=ch_r.transfer_with;
                                info.from= (from_new)? from_new : JSON.parse(h_a_key).calleridnum;
                                info.to= (to_new)? to_new : ((JSON.parse(h_a_key).channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                                info.via= (via_new)? via_new : JSON.parse(s_data_in).calleeid;
                                info.sessionid=JSON.parse(s_data_in).sessionid;
                                info.callid=data.uniqueid;
                                info.answer=(h_a_key)?1:null;
                                info.join= JSON.parse(s_data_in).join;
                                info.end_sess = JSON.parse(s_data_in).end_sess;
                                console.log('voip_events in_hangup_3 info ',JSON.stringify(info));
                                return info;
                            }


                        }else{

                            if(ch_r.transfer||ch_r.was_transfer||ch_r.transfer_with){
                                if(h_a_keys.length<2){
                                    console.log('h_a_keys[0] ',h_a_keys[0]);
                                    let a_pp_data = await this.get_key_data(h_a_keys[0]);

                                    // console.log('voip_events in_hangup_4 in ');

                                    info.event="Hangup";
                                    info.type='in';
                                    info.time_start=JSON.parse(s_data_in).time;
                                    info.time_ring=JSON.parse(h_r_data).time;
                                    info.time_answer=null;
                                    info.event_time=data.time;
                                    info.transfer=ch_r.transfer;
                                    info.was_transfer=ch_r.was_transfer;
                                    info.transfer_with=ch_r.transfer_with;
                                    info.from= (from_new)? from_new : JSON.parse(h_r_data).callerid;
                                    info.to= (to_new)? to_new : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                                    info.via= (via_new)? via_new : ((JSON.parse(a_pp_data).channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                                    info.sessionid=JSON.parse(s_data_in).sessionid;
                                    info.callid=data.uniqueid;
                                    info.answer=null;
                                    info.join= JSON.parse(s_data_in).join;
                                    info.end_sess = JSON.parse(s_data_in).end_sess;
                                    console.log('voip_events in_hangup_4 info ',JSON.stringify(info));
                                    return info;



                                }else{ console.log('voip_events in_hangup_4 null ',JSON.stringify(data));
                                    return null;
                                }
                                // }

                            }else{
                                console.log('voip_events in_hangup no_A h_h_keys ',h_h_keys);
                                console.log('voip_events in_hangup no_A s_data_in ',s_data_in);
                                console.log('voip_events in_hangup no_A h_r_data ',h_r_data);
                                console.log('voip_events in_hangup no_A ch_r ',ch_r);
                                console.log('voip_events in_hangup no_A data ',JSON.stringify(data));

                            }

                        }

                    }
                    else {
                        console.log('voip_events in_hangup_5 null |more 2 answer| ',JSON.stringify(data));
                        return null;
                    }
                }else{
                    if(h_a_key){
                        // console.log('voip_events in_hangup_5 in ');

                        info.event="Hangup";
                        info.type='in';
                        info.time_start=JSON.parse(s_data_in).time;
                        info.time_ring=JSON.parse(h_r_data).time;
                        info.time_answer=(h_a_key)?JSON.parse(h_a_key).time:null;
                        info.event_time=data.time;
                        info.transfer=ch_r.transfer;
                        info.was_transfer=ch_r.was_transfer;
                        info.transfer_with=ch_r.transfer_with;
                        info.from= (from_new)? from_new : data.calleridnum;
                        info.to= (to_new)? to_new : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                        info.via= (via_new)? via_new : JSON.parse(s_data_in).calleeid;
                        info.sessionid=JSON.parse(s_data_in).sessionid;
                        info.callid=data.uniqueid;
                        info.answer=(h_a_key)?1:null;
                        info.join= JSON.parse(s_data_in).join;
                        info.end_sess = JSON.parse(s_data_in).end_sess;
                        console.log('voip_events in_hangup_6 info ',JSON.stringify(info));
                        return info;
                    }
                    //  }
                    else{
                        //    console.log('voip_events in_hangup_6 in ');
                        //     console.log('---= hangup in no A h_h_keys ',h_h_keys);
                        //     console.log('---= hangup in no A s_data_in ',s_data_in);
                        //     console.log('---= hangup in no A h_r_data ',h_r_data);
                        //     console.log('---= hangup in no A ch_r ',ch_r);
                        //     console.log('---= hangup in A h_a_key ',h_a_key);
                        //     console.log('---= hangup in no A data ',JSON.stringify(data));

                        info.event="Hangup";
                        info.type='in';
                        info.time_start=JSON.parse(s_data_in).time;
                        info.time_ring=JSON.parse(h_r_data).time;
                        info.time_answer=(h_a_key)?JSON.parse(h_a_key).time:null;
                        info.event_time=data.time;
                        info.transfer=ch_r.transfer;
                        info.was_transfer=ch_r.was_transfer;
                        info.transfer_with=ch_r.transfer_with;
                        info.from= (from_new)? from_new : data.calleridnum;
                        info.to= (to_new)? to_new : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\//g, '');
                        info.via= (via_new)? via_new : JSON.parse(s_data_in).calleeid;
                        info.sessionid=JSON.parse(s_data_in).sessionid;
                        info.callid=data.uniqueid;
                        info.answer=(h_a_key)?1:null;
                        info.join= JSON.parse(s_data_in).join;
                        info.end_sess = JSON.parse(s_data_in).end_sess;
                        console.log('voip_events in_hangup_7 info ',JSON.stringify(info));
                        return info;
                    }

                }
            }
            else if (s_data_out){
                // console.log('voip_events H s_data_out ' +s_data_out);
                let marker_api_widget = await this.get_key_data(data.app +':'+ data.company_id + ':marker_api_widget:' + sess);
                let s_data_clicktocall = await this.get_key_data(data.app +':'+ data.company_id + ':clicktocall:' + sess+':'+ sess);

                let n_from = null;
                let n_to = null;
                let n_via = null;
                let filter_calli = [7996,8005,6366,8656,3444,8461,3177,7588,9393,9421];
                let c_filter_was_h = [8005];
                let clicktocall_D_start_filter = [7996];

                if(clicktocall_D_start_filter.includes(data.company_id)&&s_data_clicktocall){
                    s_data_out = s_data_clicktocall;
                    // console.log('voip_events H s_data_clicktocall ' +s_data_clicktocall);}
                }
                if(filter_calli.includes(data.company_id)&&(data.channel.includes('SIP/Callii'))){
                    n_from = (JSON.parse(s_data_out).a_marker=='ClickToCall')? JSON.parse(s_data_out).calleeid : JSON.parse(s_data_out).callerid ;
                    n_to = (JSON.parse(s_data_out).a_marker=='ClickToCall')? JSON.parse(s_data_out).callerid : JSON.parse(s_data_out).calleeid ;
                    n_via = JSON.parse(h_r_data).callerid;

                    console.log('out callii filter n_from, '+n_from+', n_to '+n_to+', n_via '+n_via);
                }


                if(JSON.parse(s_data_out).a_marker=='ClickToCall'){ (marker_api_widget)? info.additionally="api_widget" : info.additionally="api_c2c";}

                //  return info;
                if(h_h_keys&&(h_h_keys.length>1)&&(c_filter_was_h.includes(data.company_id)&&(data.uniqueid==JSON.parse(s_data_out).sessionid))){ console.log( '-=- out hangup was hangups ');
                } else {
                    let h_a_key = await this.get_key_data(data.app +':'+ data.company_id + ':answer:' +data.uniqueid+':'+ sess);
                    //    console.log('---= answer s_data_out ',s_data_out);
                    //   console.log('---= answer a_r_data ',a_r_data);
                    //   console.log('---= answer out data ',JSON.stringify(data));
                    if(h_a_key){

                        info.event="Hangup";
                        info.type='out';
                        info.time_start=JSON.parse(s_data_out).time;
                        info.time_ring=JSON.parse(h_r_data).time;
                        info.time_answer=(h_a_key)?JSON.parse(h_a_key).time:null;
                        info.event_time=data.time;
                        info.transfer=null;
                        info.was_transfer=null;
                        info.transfer_with=null;
                        info.from= (n_from)? n_from : JSON.parse(h_r_data).callerid;
                        info.to= (n_to)? n_to : await this.filter_sharp(JSON.parse(h_r_data).realcalleeid);
                        info.via= (n_via)? n_via : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\/|AsyncGoto\/|Transfered\//g, '');
                        info.sessionid=JSON.parse(s_data_out).sessionid;
                        info.callid=data.uniqueid;
                        info.answer=(h_a_key)?1:null;
                        console.log("H_out_1 "+ JSON.stringify(info) );
                        if(filter_calli.includes(data.company_id)&&(info.sessionid==info.callid)){
                            console.log('voip_events out_hangup_1 null ',JSON.stringify(data));
                            return null;
                        }else {
                            console.log('voip_events out_hangup_2 info ',JSON.stringify(info));
                            return info;}

                    }else{
                        let a_pp_key = await this.get_key_pp_v2(data,'answer',data.uniqueid,sess);
                        if(a_pp_key){
                            //console.log('-=- out hangups a_pp_key ',a_pp_key);
                            let a_pp_data = await this.get_key_data(a_pp_key);
                            info.event="Hangup";
                            info.type='out';
                            info.time_start=JSON.parse(s_data_out).time;
                            info.time_ring=JSON.parse(h_r_data).time;
                            info.time_answer=(h_a_key)?JSON.parse(h_a_key).time:null;
                            info.event_time=data.time;
                            info.transfer=null;
                            info.was_transfer=null;
                            info.transfer_with=null;
                            info.from= (n_from)? n_from : JSON.parse(h_r_data).callerid;
                            info.to= (n_to)? n_to : await this.filter_sharp(JSON.parse(h_r_data).realcalleeid);
                            info.via= (n_via)? n_via : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\/|AsyncGoto\/|Transfered\//g, '');
                            info.sessionid=JSON.parse(s_data_out).sessionid;
                            info.callid=JSON.parse(a_pp_data).uniqueid;
                            info.answer=1;
                            console.log('voip_events out_hangup_3 info ',JSON.stringify(info));
                            return info;
                        }
                        else{
                            let s_data_clicktocall = await this.get_key_data(data.app +':'+ data.company_id + ':clicktocall:' + sess+':'+ sess);
                            if(s_data_clicktocall){

                                info.event="Hangup";
                                info.type='out';
                                info.time_start=JSON.parse(s_data_out).time;
                                info.time_ring=JSON.parse(h_r_data).time;
                                info.time_answer=(h_a_key)?JSON.parse(h_a_key).time:null;
                                info.event_time=data.time;
                                info.transfer=null;
                                info.was_transfer=null;
                                info.transfer_with=null;
                                info.from= (n_from)? n_from : JSON.parse(h_r_data).callerid;
                                info.to= (n_to)? n_to : await this.filter_sharp(JSON.parse(h_r_data).realcalleeid);
                                info.via= (n_via)? n_via : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\/|AsyncGoto\/|Transfered\//g, '');
                                info.sessionid=JSON.parse(s_data_out).sessionid;
                                info.callid=data.uniqueid;
                                info.answer=null;
                                console.log('voip_events out_hangup_4 info ',JSON.stringify(info));
                                return info;

                            }else{
                                if(data.uniqueid!=JSON.parse(s_data_out).sessionid){
                                    info.event="Hangup";
                                    info.type='out';
                                    info.time_start=JSON.parse(s_data_out).time;
                                    info.time_ring=JSON.parse(h_r_data).time;
                                    info.time_answer=(h_a_key)?JSON.parse(h_a_key).time:null;
                                    info.event_time=data.time;
                                    info.transfer=null;
                                    info.was_transfer=null ;
                                    info.transfer_with=null;
                                    info.from= (n_from)? n_from : JSON.parse(h_r_data).callerid;
                                    info.to= (n_to)? n_to : await this.filter_sharp(JSON.parse(h_r_data).realcalleeid);
                                    info.via= (n_via)? n_via : ((data.channel).split(/-|@/)[0]).replace(/SIP\/|GSM_|Local\/|AsyncGoto\/|Transfered\//g, '');
                                    info.sessionid=JSON.parse(s_data_out).sessionid;
                                    info.callid=data.uniqueid;
                                    info.answer=null;
                                    console.log('voip_events out_hangup_5 info ',JSON.stringify(info));
                                    return info;
                                }
                                console.log('voip_events out_hangup_6 null |on a_pp_key & and no a_key| ',JSON.stringify(data));
                                return null;
                            }



                        }
                    }


                }


            }else {
                console.log('voip_events out_hangup_7 null |ring is no s_data_in || s_data_out| ',JSON.stringify(data));
                return null;
            }
            // let key = data.app +':'+ data.company_id + ':' + data.a_marker + ':' + data.uniqueid+':'+k_r.split(data.uniqueid+':')[1];


        }
        else {
            console.log('voip_events out_hangup_8 null |no ring key| ',JSON.stringify(data));
            return null;
        }

    } else if(data.a_marker==='Cdr'){
        //   ami_sip:2942:end_in:1586340221.1171812:1586340221.1171812
        let end_data_in = await this.get_key_data(data.app +':'+ data.company_id + ':end_in:' + data.uniqueid+':'+ data.uniqueid);
        // JSON.stringify
        if(end_data_in){
            // ждем start in
            await new Promise(resolve => setTimeout(resolve, 150));
            let end_line = JSON.parse(data.int.options).end_line;
            info.event="End_in";
            info.type="in";
            info.from=JSON.parse(end_data_in).callerid;
            info.to=(end_line)? end_line : data.internal_phones.pop();
            info.via=JSON.parse(end_data_in).calleeid;
            info.sessionid=JSON.parse(end_data_in).sessionid;
            info.time_start=JSON.parse(end_data_in).time;
            info.event_time=data.time;
            console.log('voip_events in_hangup_X info |End_in| ',JSON.stringify(info));
            return info;

        }else {
            console.log('voip_events out_hangup_X null |End_in| ',JSON.stringify(data));

            return null;}
    }
    else{}
}

exports.filter_sharp  = async (number)=>{
    let new_number = null;
    if(number.includes('#')){
        new_number = number.split(/#/)[1]
        console.log('test cat_# ',new_number);
        return new_number;
    }
    else {return number;}

}

exports.get_keys  = async (ev,part,key_p)=>{

    let key = ev.app +':'+ ev.company_id + ':'+part+':' + key_p;
    let t_data = await this.get__keys(key);
    if(t_data.length > 0){
        //    console.log(' redis get_keys ',t_data);

        return t_data[0];
    } else {
        return null;
    }
}

exports.get_t_key  = async (e_s)=>{

    let key = e_s.app +':'+ e_s.company_id + ':transfer:' + e_s.sessionid+ ':*';
    let t_data = await this.get__keys(key);
    if(t_data.length > 0){
        return t_data;
    } else {
        return null;
    }
}

exports.get_t_key_v2  = async (e_s)=>{

    let key = e_s.app +':'+ e_s.company_id + ':transfer:'+ e_s.sessionid +':'+ e_s.sessionid+ ':*';
    let t_data = await this.get__keys(key);
    if(t_data.length > 0){
        return t_data;
    } else {
        return null;
    }
}

// exports.cre_t_key_v2 = async (key,ev)=>{
//     let add = await setAsync(key, ev);
//     let exp = await expireAsync(key, rconf.key_exp);

// }

exports.get_key_v2  = async (ev,part,key_c,key_s)=>{

    let key = ev.app +':'+ ev.company_id + ':'+part+':'+ key_c+':' + key_s;
    let t_data = await this.get__keys(key);
    if(t_data.length > 0){
        //     console.log(' redis get_keys ',t_data);

        return t_data.pop();
    } else {
        return null;
    }
}

exports.get_key_pp_v2  = async (ev,part,key_c,key_s)=>{

    let key = ev.app +':'+ ev.company_id + ':'+part+':'+ key_c+':' + key_s;
    let keys = ev.app +':'+ ev.company_id + ':'+part+':*:' + key_s;
    // console.log('-=- key ',key);
    // console.log('-=- keys ',keys);


    let t_data = await this.get__keys(keys);
    //   console.log('-=- t_data ',t_data);

    if((t_data.length > 0)&&(t_data.length <3)){
        //       console.log('-=- foreach ');
        //  if(t_data[0]===key){return t_data[1] }

        return (t_data[0]===key)?t_data[1]:t_data[0]

        // t_data.forEach(element => {
        //     console.log('-=- element ',element);

        //     if(element===key){
        //         console.log('-===-');

        //     }
        //     else {return element;}

        //   });
        //   console.log('-=- redis pp get_keys ',t_data);
        //     console.log('-=- t_data.length-1 ', t_data.length-1);
        //     console.log('-=- t_data[t_data.length-1]; ',t_data[t_data.length-1]);

        //    return t_data[t_data.length-1];
        // t_data.length-2
    } else {
        return null;
    }
}


exports.get_keys_v2  = async (ev,part,key_c,key_s)=>{

    let key = ev.app +':'+ ev.company_id + ':'+part+':'+ key_c+':' + key_s;
    let t_data = await this.get__keys(key);
    if(t_data.length > 0){
        //     console.log(' redis get_keys ',t_data);

        return t_data;
    } else {
        return null;
    }
}


exports.cre_t_key = async (key,ev)=>{
    await this.save_key_data(key,JSON.parse(ev));

    // let add = await setAsync(key, ev);
    // let exp = await expireAsync(key, rconf.key_exp);

}


// exports.save_key_data = async (key,data) => {
//     await this.save_key_data_1(key,data);

//     client_1 = redis.createClient(rconf.port, rconf.host);
//     const setAsync = promisify(client_1.set).bind(client_1);
//     const expireAsync = promisify(client_1.expire).bind(client_1);
//     const quit = promisify(client_1.quit).bind(client_1);

//      let val = JSON.stringify(data);
//      let add = await setAsync(key, val);
//      let exp = await expireAsync(key, rconf.key_exp);
//      await quit();
//      if(add==='OK'&&exp===1){ console.log('successful_save_key '+key);
//        return null; }
//        else{ console.log('error_save_key '+key+' | add '+JSON.stringify(add)+' | exp '+JSON.stringify(exp)); return null;}

//    }

exports.save_key_data = async (key,data) => {

    client_1 = redis.createClient(rconf_1.port, rconf_1.host);
    const setAsync = promisify(client_1.set).bind(client_1);
    const expireAsync = promisify(client_1.expire).bind(client_1);
    const quit = promisify(client_1.quit).bind(client_1);

    let val = JSON.stringify(data);
    let add = await setAsync(key, val);
    let exp = await expireAsync(key, rconf.key_exp);
    await quit();
    if(add==='OK'&&exp===1){ console.log('successful_save_key '+key);
        return null; }
    else{ console.log('error_save_key '+key+' | add '+JSON.stringify(add)+' | exp '+JSON.stringify(exp)); return null;}

}


//    exports.get_key_data = async (key) => {
//        await this.get_key_data_1(key);

//     client_2 = redis.createClient(rconf.port, rconf.host);
//     const getAsync = promisify(client_2.get).bind(client_2);
//     const quit = promisify(client_2.quit).bind(client_2);
//     let data = await getAsync(key);
//     console.log('get_key '+key+' result '+data);
//     await quit();
//     return data;
// }

exports.get_key_data = async (key) => {
    client_2 = redis.createClient(rconf_1.port, rconf_1.host);
    const getAsync = promisify(client_2.get).bind(client_2);
    const quit = promisify(client_2.quit).bind(client_2);
    let data = await getAsync(key);
    console.log('get_key '+key+' result '+data);
    await quit();
    return data;
}

// exports.get__keys  = async (key)=>{
//     await this.get__keys_1(key);
//     client_3 = redis.createClient(rconf.port, rconf.host);
//     const keysAsync = promisify(client_3.keys).bind(client_3);
//     const quit = promisify(client_3.quit).bind(client_3);
//     let keys = await keysAsync(key);
//     await quit();
//     console.log('get__keys key '+key+' ',keys);
//     return keys;
// }

exports.get__keys  = async (key)=>{
    client_3 = redis.createClient(rconf_1.port, rconf_1.host);
    const keysAsync = promisify(client_3.keys).bind(client_3);
    const quit = promisify(client_3.quit).bind(client_3);
    let keys = await keysAsync(key);
    await quit();
    console.log('get__keys key '+key+' ',keys);
    return keys;
}