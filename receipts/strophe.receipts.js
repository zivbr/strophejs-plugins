Strophe.addConnectionPlugin('receipts', {
    _conn: null,
    _msgQueue: {},
    _messageIDSuffix: '',

    init: function(conn) {
        this._conn = conn;
        Strophe.addNamespace('RECEIPTS', 'urn:xmpp:receipts');
    },
	
	/* sendMessage
    ** sends a message with a receipt and stores the message in the queue
    ** in case a receipt is never received
    **
    ** msg should be a builder
    */
    sendMessage: function(msg) {
        var id = this._conn.getUniqueId(this._messageIDSuffix);
        
        msg.tree().setAttribute('id', id);

        var request = Strophe.xmlElement('request', {'xmlns': Strophe.NS.RECEIPTS});
        msg.tree().appendChild(request);

        this._msgQueue[id] = msg;

        this._conn.send(msg);
        
        return id;
        
    },

	/* addMessageHandler
    ** add a message handler that handles XEP-0184 message receipts
    */
    addReceiptHandler: function(handler, type, from, options) {
        var that = this;

        var proxyHandler = function(msg) {
            that._processReceipt(msg);
         
            // call original handler
            return handler(msg);
        };

        this._conn.addHandler(proxyHandler, Strophe.NS.RECEIPTS, 'message',
                              type, null, from, options);
    },
    
    /*
	 * process a XEP-0184 message receipts
	 * send recept on request
	 * remove msg from queue on received 
	*/
	_processReceipt: function(msg){
		var id = msg.getAttribute('id'),
			from = msg.getAttribute('from'),
			req = msg.getElementsByTagName('request'),
			rec = msg.getElementsByTagName('received');
			
			// check for request in message
            if (req.length > 0) {
				// send receipt
				var out = $msg({to: from, from: this._conn.jid, id: this._conn.getUniqueId(this._messageIDSuffix), type: 'chat'}).c('body').t('a'),
					request = Strophe.xmlElement('received', {'xmlns': Strophe.NS.RECEIPTS, 'id': id});
				out.tree().appendChild(request);
				this._conn.send(out);
			}
			// check for received
            if (rec.length > 0) {
                var recv_id = rec[0].getAttribute('id');
				if (recv_id) { // delete msg from queue
					delete this._msgQueue[recv_id];
				}
            }			
	},
	
    getUnreceivedMsgs: function() {
        var msgs = [];
        for (var id in this._msgQueue) {
            if (this._msgQueue.hasOwnProperty(id)) {
                msgs.push(this._msgQueue[id]);
            }
        }
        return msgs;
    },

    clearMessages: function() {
        this._msgQueue = {};
    }
});