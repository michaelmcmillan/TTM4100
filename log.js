function Log (level, message, timestamp) {
    var colors = {
        success: ['\x1b[32m', '\x1b[0m'],
        info: ['\x1b[36m', '\x1b[0m'],
        error: ['\x1b[31m', '\x1b[0m'],
        history: ['\x1b[33m', '\x1b[0m']
    }

    this.currentStamp = function (stamp) {
        if (stamp === undefined)
            stamp = new Date();

        return '' +
        ('0' + stamp.getHours()).slice(-2)   + ':' + 
        ('0' + stamp.getMinutes()).slice(-2) + ':' + 
        ('0' + stamp.getSeconds()).slice(-2);
    }
    
    if (process.env['TEST'] !== undefined)
        return;

    if (timestamp !== undefined)
        console.log('['+ this.currentStamp(new Date(timestamp)) +']' + colors[level][0], message, colors[level][1]);
    else
        console.log('['+ this.currentStamp() +']' + colors[level][0], message, colors[level][1]);
}

module.exports = Log;
