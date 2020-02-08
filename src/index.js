const cuid = require('cuid');

const composeXmlWrapper = (body) => {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xmeml version="5">
  ${body}
</xmeml>`
};

const composeXmlSequence = ({name, clips, sampleRate, duration, markers=""}) => {
    return `<sequence id="sequence-0">
    <media>
      <audio>
        <format>
          <samplecharacteristics>
            <depth>3</depth>
            <samplerate>${sampleRate}</samplerate>
          </samplecharacteristics>
        </format> 
        <track>       
            ${clips}
        </track>
     </audio>
    </media>
    <uuid>${cuid()}</uuid>
    <duration>${duration}</duration>
    <name>${name}</name>
    <rate>
        <timebase>1</timebase>
    </rate>
    ${markers}
</sequence>`;
};

const composeXmlClips = ({
    index,
    duration,
    clipName,
    inPoint,
    outPoint,
    startTime,
    endTime,
    sampleRate
}) => { // calculate duration
    return `<clipitem id="clipitem-${index}">
      <masterclipid>master-clip-${ index + 1 }</masterclipid>
      <name>${clipName} - ${index + 1 }</name>
      <enabled>TRUE</enabled>
      <duration>${duration}</duration>
      <in>${inPoint}</in>
      <out>${outPoint}</out>
      <start>${startTime}</start>
      <end>${endTime}</end>
      <rate>
        <timebase>1</timebase>
      </rate>
      <file id="${'file-'+index}">
      <media>
        <audio>
        <samplecharacteristics>
            <depth>3</depth>
            <samplerate>${sampleRate}</samplerate>
        </samplecharacteristics>
        <channelcount>1</channelcount>
        </audio>
      </media>
      <name>${clipName}</name>
      <duration>${duration}</duration>
      <pathurl>${clipName}</pathurl>
      <rate>
        <timebase>1</timebase>
      </rate>
    </file>
  </clipitem>`
}

const calculateSequenceDuration = (sequenceEDLJson) => {
    return sequenceEDLJson.events.reduce((total, event) => {
        return(event.endTime - event.startTime) + total
    }, 0)
}

// comment's markers are not actually displayed in adobe audition
const createMarker = ({name, comment, inPoint, outPoint}) => {
    return `<marker>
    <name>${name}</name>
    <comment>${comment}</comment>
    <in>${inPoint}</in>
    <out>${outPoint}</out>
  </marker>`
}

// optional speaker and text

const composerMarkers = (events)=>{
    let seQuenceInPoint = 0;
    let sequenceOutPoint = 0;
    const result = events.map((event, index)=>{
        const duration = event.endTime - event.startTime;
        if (index === 0) {
            sequenceOutPoint += duration;
        } else if (index !== 0) {
            seQuenceInPoint =  sequenceOutPoint;
            sequenceOutPoint += seQuenceInPoint + duration; 
        }
        if(event.text && event.speaker){
            return createMarker({name: event.speaker, comment:event.text, inPoint: seQuenceInPoint, outPoint: sequenceOutPoint})
        }
        else{
            return '';
        }
    })
    return result.join('\n')
}

const jsonToAudition = (sequenceEDLJson) => { // loop through segments, create clips xml
    const totalDuraiton = calculateSequenceDuration(sequenceEDLJson);
    let seQuenceInPoint = 0;
    let sequenceOutPoint = 0;
    let projectSampleRate = 44100;
    // TODO: geenrate unique file ids per clip, and add back to the edl sequence
    const clipsXML = sequenceEDLJson.events.map((event, index) => {
        const duration = event.endTime - event.startTime;
        if (index === 0) {
            sequenceOutPoint += duration;
        } else if (index !== 0) {
            seQuenceInPoint =  sequenceOutPoint;
            sequenceOutPoint += seQuenceInPoint + duration; 
        }

        const sampleRate = event.sampleRate ? event.sampleRate : 44100;
        projectSampleRate = sampleRate;
        const result = composeXmlClips({
            index,
            duration: totalDuraiton,
            clipName: event.clipName,
            inPoint: event.startTime,
            outPoint:  event.endTime,
            startTime: seQuenceInPoint,
            endTime: sequenceOutPoint,
            sampleRate
        })
        return result;
    }).join('\n  ')

    // optional markers data 
    const markers = composerMarkers(sequenceEDLJson.events)
    
    const sequenceXML = composeXmlSequence({
        name: sequenceEDLJson.title, 
        clips: clipsXML, 
        sampleRate: projectSampleRate,
        duration: totalDuraiton,
        markers: markers
    });
    return composeXmlWrapper(sequenceXML)
}

module.exports = jsonToAudition;
