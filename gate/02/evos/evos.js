const redis = require('./redis');
const key = require('./keys');
const dateFormat = require('dateformat');
const request = require('request-promise');
const { exec } = require('child_process')
const { Telnet } = require('telnet-client');
const net = require("net");

exports.evos = async (all_data) => {
// console.log('voip_events all_data '+ JSON.stringify(all_data));
    //   console.log('error_send_itoollabs_e_v3_send '+JSON.stringify(error)+' | options '+JSON.stringify(options));

    let event={};

    if(all_data.a_marker==='start_in'){

        event.event="Start";
        event.type="in";
        event.from=all_data.callerid;
        event.to=all_data.calleeid;
        event.via=all_data.calleeid;
        event.sessionid=all_data.sessionid;
        event.event_time=all_data.time;

        //   await this.voip_events_send(event,all_data.int);

    }
    else if(all_data.a_marker==='ClickToCall'){
        //    console.log('-ClickToCall all_data--- ',all_data);
        event.event="Start";
        event.type="out";
        event.from=all_data.callerid;
        event.to=all_data.calleeid;
        event.via=all_data.calleeid;
        event.sessionid=all_data.sessionid;
        event.event_time=all_data.time;

        //  await this.voip_events_send(event,all_data.int);
        // JSON.stringify(event));

    }else  if(all_data.a_marker==='start_out'){
        let s_info = await redis.get_key_i_v2(all_data);
        //  console.log(' ==== send start_out ',JSON.stringify(s_info));
        if(s_info&&(s_info.transfer||s_info.was_transfer||s_info.transfer_with)){
            //   console.log('-=- no send start_out  transfer||was_transfer||transfer_with -=-');

        } else if(s_info){

            event.event="Start";
            event.type="out";
            event.from=all_data.callerid;
            event.to=all_data.calleeid;
            event.via=all_data.calleeid;
            event.sessionid=all_data.sessionid;
            event.event_time=all_data.time;

            //  await this.voip_events_send(event,all_data.int);

        } else{ console.log('-=- no send start_out no info -=-'); }


    } else if (all_data.a_marker==='ring'){

        //   await redis.save_key_v3(all_data);
        let s_info = await redis.get_key_i_v2(all_data);

        //  console.log(' -- send ev ring s_info ',s_info);
        if (s_info&&(s_info.transfer)&&(s_info.type==='in')){

        }
        else if(s_info&&(s_info.was_transfer||s_info.transfer_with)&&(s_info.type==='in')){
            event.event="StartCall";
            event.type=s_info.type;
            event.from=s_info.from;
            event.to=s_info.to;
            event.via=s_info.via;
            event.call_id=s_info.callid;
            event.sessionid=all_data.sessionid;
            event.redirecting=1;
            event.additionally=null;
            event.time_start=s_info.time_start;
            event.event_time=s_info.event_time;
            event.join = s_info.join;

            // await this.voip_events_send(event,all_data.int);

        }
        else if((s_info)&&(s_info.type==='in')){
            event.event="StartCall";
            event.type=s_info.type;
            event.from=s_info.from;
            event.to=s_info.to;
            event.via=s_info.via;
            event.call_id=s_info.callid;
            event.sessionid=all_data.sessionid;
            event.redirecting=null;
            event.additionally=null;
            event.time_start=s_info.time_start;
            event.event_time=s_info.event_time;
            event.join = s_info.join;

            //  await this.voip_events_send(event,all_data.int);
        }
        // ----------------------
        else if(s_info&&(s_info.type==='out')&&(s_info.transfer||s_info.was_transfer||s_info.transfer_with)){
            //  console.log('-=- no send out ring with  transfer||was_transfer||transfer_with -=-');
            console.log(' ==== send ev ring out was_transfer info ',JSON.stringify(s_info));
            // console.log(' ==== send ev ring was_transfer out ',JSON.stringify(all_data));

        }
        else if(s_info&&(s_info.type==='out')){
            event.event="StartCall";
            event.type=s_info.type;
            event.from=s_info.from;
            event.to=s_info.to;
            event.via=s_info.via;
            event.call_id=s_info.callid;
            event.sessionid=all_data.sessionid;
            event.redirecting=null;
            event.additionally=null;
            event.time_start=s_info.time_start;
            event.event_time=s_info.event_time;

            //  await this.voip_events_send(event,all_data.int);


        }
        else {
            console.log('===no_send_out_ring no info -=-');
            console.log(' =======no_send_out_ring s_info  ',JSON.stringify(s_info));
            console.log(' =======no_send_out_ring all_data  ',JSON.stringify(all_data));
        }


    }
    else if (all_data.a_marker==='answer'){

        let s_info = await redis.get_key_i_v2(all_data);
        if(s_info){
            event.event="Answer";
            event.type=s_info.type;
            event.from=s_info.from;
            event.to=s_info.to;
            event.via=s_info.via;
            event.call_id=s_info.callid;
            event.sessionid=s_info.sessionid;
            event.redirecting=(s_info.was_transfer||s_info.transfer_with)?1:null;
            event.additionally=null;
            event.time_start=s_info.time_start;
            event.time_ring=s_info.time_ring;
            event.event_time=s_info.event_time;
            event.join = (s_info.type==='in')? s_info.join: null;


            //  await this.voip_events_send(event,all_data.int);
            if(event.type == 'in') {
                // let body = `Message: Call \\r\\n\nCallerID: ${event.from} \\r\\n\nCarType: General  \\r\\n \\r\\n\n`;
                let num = event.from
                let ph = JSON.parse(all_data.int.options).phones;
                let to = ph[event.to] || null
                console.log('---> EVOS event, all_data: ',event, all_data, ph, to, event.to);
                if(!to) return;
                await exports.voip_events_send(num, to);
            }
            if(event.type == 'out'){
                if((!(all_data.internal_phones).includes(event.from) && !(all_data.external_phones).includes(event.from)) && (event.to == event.via) && ((all_data.internal_phones).includes(event.to) && (all_data.internal_phones).includes(event.via))) {
                    let num = event.from
                    let ph = JSON.parse(all_data.int.options).phones;
                    let to = ph[event.to] || null
                    console.log('---> EVOS event, out all_data: ',event, all_data, ph, to, event.to);
                    if(!to) return;
                    await exports.voip_events_send(num, to);
                }
            }

        }

    }
    else if (all_data.a_marker==='hangup'){

        // let ct_data = null;
        let s_info = await redis.get_key_i_v2(all_data);
        let b_mp3 = JSON.parse(all_data.int.options).brand_url;
        let b_audio = JSON.parse(all_data.int.options).brand_audio_url;

        //  console.log('========b_audio  ',b_audio);
        if(s_info){
            // if (s_info.type==='in'&&JSON.parse(all_data.int.options).ct_event == 1) {
            //   ct_data = await this.get_ct(s_info.sessionid,all_data.int);
            // }
            //    let mp3 = 'https://gate.streamtele.com/api/'+all_data.int.name+'/audio?'+await key.get_audio_key2(s_info.sessionid);
            let mp3 = b_mp3 +'/api/'+all_data.int.name+'/audio?'+await key.get_audio_key2(s_info.sessionid,b_audio);
            event.event="Hangup";
            event.type=s_info.type;
            event.from=s_info.from;
            event.to=s_info.to;
            event.via=s_info.via;
            event.call_id=s_info.callid;
            event.sessionid=s_info.sessionid;
            event.redirecting=(s_info.was_transfer||s_info.transfer_with)?1:null;
            event.additionally=s_info.additionally;
            event.result=(s_info.answer)?'answer':'no answer';
            event.recordUrl=(s_info.answer)?mp3:((event.redirecting)?mp3:null);
            event.time_start=s_info.time_start;
            event.time_ring=s_info.time_ring;
            event.time_answer=s_info.time_answer;
            event.event_time=s_info.event_time;
            event.join = (s_info.type==='in')? s_info.join: null;
            event.end_sess = (s_info.type==='in')? s_info.end_sess: null;
            // event.ct_data = ct_data;

            //  await this.voip_events_send(event,all_data.int);
            // JSON.stringify(event));
            // await this.streamtele_send(event,all_data.int);
            // let mp3 = 'https://gate.streamtele.com/api/'+all_data.int.name+'/audio?'+await key.get_audio_key2(s_info.sessionid);
            //   console.log(' ==== send ev hangup info',JSON.stringify(s_info));
        }

        //    console.log(' -- send ev hangup data ',JSON.stringify(all_data));
    }  else if(all_data.a_marker==='Cdr'){
        // let ct_data = null;
        let s_info = await redis.get_key_i_v2(all_data);
        // {
        //   event: 'End_in',
        //   type: 'in',
        //   from: '+380636414032',
        //   to: '380962889852',
        //   via: '380962889852',
        //   time_start: 1586342515300,
        //   transfer: null,
        //   was_transfer: null,
        //   transfer_with: null,
        //   answer: null,
        //   sessionid: '1586342515.1217201',
        //   callid: null,
        //   event_time: 1586342518483
        // }


        if(s_info){
            // if (s_info.type==='in'&&JSON.parse(all_data.int.options).ct_event == 1) {
            //   ct_data = await this.get_ct(s_info.sessionid,all_data.int);
            // }
            event.event=s_info.event;
            event.type=s_info.type;
            event.from=s_info.from;
            event.to=s_info.to;
            event.via=s_info.via;
            event.time_start=s_info.time_start;
            event.event_time=s_info.event_time;
            event.sessionid=s_info.sessionid;
            // event.ct_data = ct_data;

            //  await this.voip_events_send(event,all_data.int);
        }


    }

}

exports.voip_events_send = async (num, to) => {
    if (!to || to == null || to == undefined) return;
    try {
        let host = to.split(':')[0]
        let port = Number(to.substring(to.indexOf(':') + 1).trim());

        const command = `
    (
        echo open ${host} ${port}
        sleep 1
        echo "Message: Call \r\n CallerID: ${num} \r\n \r\n"
    ) | telnet
    `
        console.log('---> EVOS CMD ', command)
        exec(command, { encoding: 'utf-8' }, (error, stdout, stderr) => {
            if (error !== null && stderr != 'Connection closed by foreign host.\r\n') {
                console.log('---> EVOS Error', {error, stderr})
            }
            const [responseMetadata, response] = stdout.split('\n\n')
            console.log('---> EVOS Metadata', responseMetadata, {host, port, num})
            console.log('---> EVOS Response', response)
        })
    } catch (error) {
        console.log(`---> EVOS send ${error}`);
        return null;
    }

}

function setTimeoutPromise(delay) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), delay);
    });
}