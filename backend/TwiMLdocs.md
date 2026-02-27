TwiML™ for Programmable Voice


What is TwiML?


TwiML (the Twilio Markup Language) is a set of instructions you can use to tell Twilio what to do when you receive an incoming call or SMS.

How TwiML works


When someone makes a call to one of your Twilio numbers, Twilio looks up the URL associated with that phone number and sends it a request. Twilio then reads the TwiML instructions hosted at that URL to determine what to do, whether it's recording the call, playing a message for the caller, or prompting the caller to press digits on their keypad.

At its core, TwiML is an XML
 document with special tags defined by Twilio to help you build your Programmable Voice application.

(information)
Info
Not making phone calls? TwiML powers more than just Twilio Programmable Voice. For instance, check out the documentation on how to use TwiML with Programmable SMS.

The following will say "Hello, world!" when someone dials a Twilio number configured with this TwiML:


Copy code block
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Hello, world!</Say>
</Response>
You can always return raw TwiML from your language of choice, or leverage the Twilio SDKs to automatically create valid TwiML for you. In the code sample below, toggle to your preferred web programming language to see how the above TwiML looks using the SDK.

<Say> 'Hello' to an inbound caller

Node.js

Report code block

Copy code block
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const response = new VoiceResponse();
response.say('Hello!');

console.log(response.toString());
Output

Copy output
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello!</Say>
</Response>
(information)
Info
Check out our short tutorial on responding to incoming phone calls, available in our six supported SDK languages. You can also leverage Twilio's TwiML bins
, our serverless solution that lets you write TwiML that Twilio will host for you so you can quickly prototype a solution without spinning up a web server.

Outbound calls (calls from a Twilio number to an outside number) are controlled using TwiML in the same manner. When you initiate an outbound call with the Twilio API, Twilio then requests your TwiML to learn how to handle the call.

Twilio executes just one TwiML document to the caller at a time, but many TwiML documents can be linked together to build complex interactive voice applications.

TwiML elements


In TwiML parlance, XML elements are divided into three groups: the root <Response> element, verbs, and nouns.

(warning)
Warning
TwiML elements (verbs and nouns) have case-sensitive names. For example, using <say> instead of <Say> will result in an error. Attribute names are also case sensitive and camelCased.

You can use XML comments freely in your TwiML; the interpreter ignores them.

The <Response> element
In any TwiML response to a Twilio request, you must nest all verb elements within <Response>, the root element of Twilio's XML markup:


Copy code block
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>
      This message must be nested in a Response element
      in order for Twilio to say it to your caller.
    </Say>
</Response>
Any other structure is considered invalid.

TwiML verbs for Programmable Voice
TwiML verbs tell Twilio what actions to take on a given call. Because of this, most elements in a TwiML document are TwiML verbs. Verb names are case sensitive, as are their attribute names.

You can use different combinations of TwiML verbs to create all kinds of interactive voice applications. The core TwiML verbs for Programmable Voice are:

<Say> — Read text to the caller
<Play> — Play an audio file for the caller
<Dial> — Add another party to the call
<Record> — Record the caller's voice
<Gather> — Collect digits the caller types on their keypad
The following verbs may be used to control the flow of your call:

<Hangup> — Hang up the call.
<Enqueue> — Add the caller to a queue of callers.
<Leave> — Remove a caller from a queue of callers.
<Pause> — Wait before executing more instructions.
<Redirect> — Redirect call flow to a different TwiML document.
<Refer> — Twilio initiates SIP REFER towards IP communication infrastructure.
<Reject> — Decline an incoming call without being billed.
The following nouns provide advanced capabilities:

<VirtualAgent> — Build AI-powered Conversational IVR.
(warning)
Warning
There are certain situations when the TwiML interpreter may not reach verbs in a TwiML document because control flow has passed to a different document. This usually happens when a verb's action attribute is set.

For example, if a <Say> verb is followed by a <Redirect> and then another <Say>, the second <Say> is unreachable because <Redirect> transfers full control of a call to the TwiML at a different URL.

TwiML nouns
A TwiML noun describes the phone numbers and API resources you want to take action on. Effectively, a TwiML noun is anything nested inside a verb that is not itself a verb: it's whatever the verb is acting on.

TwiML nouns are usually just text. However, as in the case of <Dial> with its <Number> and <Conference> nouns, at times there are nested XML elements that are nouns.

Twilio's request to your application


When someone makes an inbound call to one of your Twilio phone numbers, Twilio needs to request TwiML from your application to get instructions for handling the call.

You can configure your Twilio phone number to point to your application's URL by visiting the phone numbers section of the Console
. Select your phone number, then scroll to the Voice & Fax section to set a webhook, TwiML bin, or Twilio Function for Twilio to send that HTTP request when a call comes in:

Webhook configuration for incoming voice calls with URL and HTTP GET method.
Expand image
Twilio makes its request over HTTP, either as a GET or POST, just like requesting a web page in your browser or submitting a form.

(warning)
Warning
Twilio cannot cache POSTs. If you want Twilio to cache static TwiML pages, then have Twilio make requests to your application using GET.

By including parameters and values in its request, Twilio sends data to your application that you can act upon before responding.

Request parameters


Twilio always sends the following parameters when it sends a request to your application to retrieve instructions for how to handle a call.

These will send as either POST parameters or URL query parameters, depending on which HTTP method you've configured.

Parameter	Description
CallSid	A unique identifier for this call, generated by Twilio.
AccountSid	Your Twilio account ID. It is 34 characters long, and always starts with the letters AC.
From	The phone number or client identifier of the party that initiated the call. Phone numbers are formatted with a '+' and country code, e.g., +16175551212 (E.164 format). Client identifiers begin with the client: URI scheme; for example, on a call from a client named 'charlie', the From parameter will be client:charlie. If a caller ID is withheld or otherwise unavailable, you may receive a string that contains anonymous, unknown, or other descriptions.
To	The phone number or client identifier of the called party. Phone numbers are formatted with a '+' and country code, e.g., +16175551212(E.164 format). Client identifiers begin with the client: URI scheme; for example, for a call to a client named 'joey', the To parameter will be client:joey.
CallStatus	A descriptive status for the call. The value is one of the following: queued, ringing, in-progress, completed, busy, failed or no-answer. See the CallStatus section below for more details.
ApiVersion	The version of the Twilio API used to handle this call. For incoming calls, this is determined by the API version set on the called number. For outgoing calls, this is the version used by the REST API request from the outgoing call.
Direction	A string describing the direction of the call: inbound for inbound calls outbound-api for calls initiated via the REST API outbound-dial for calls initiated by a <Dial> verb.
ForwardedFrom	This parameter is set only when Twilio receives a forwarded call, but its value depends on the caller's carrier including information when forwarding. Not all carriers support passing this information.
CallerName	This parameter is set when the IncomingPhoneNumber that received the call has had its VoiceCallerIdLookup value set to true. Learn about Lookup pricing
.
ParentCallSid	A unique identifier for the call that created this leg. This parameter is not passed if this is the first leg of a call.
CallToken	A token string needed to invoke a forwarded call.
Twilio also attempts to look up geographic data based on the To and From phone numbers. If available, Twilio will send the following parameters with its request:

Parameter	Description
FromCity	The city of the caller
FromState	The state or province of the caller
FromZip	The postal code of the caller
FromCountry	The country of the caller
ToCity	The city of the called party
ToState	The state or province of the called party
ToZip	The postal code of the called party
ToCountry	The country of the called party
Twilio will provide the parameters listed above when it makes a request to your application to retrieve instructions for how to handle a call. This might occur when an inbound call comes to your Twilio number, or after a TwiML verb has completed and you've provided an action URL where Twilio can retrieve the next set of instructions. Depending on what is happening on a call, other variables may also be sent.

For example, when Twilio receives SIP, it will send additional parameters to your web application: you'll find the list of parameters sent with SIP in our guide SIP and TwiML Interaction.

(information)
Info
There are some instances in which Twilio will send a request that doesn't contain all of the above parameters. For example, if you have provided a statusCallback URL in a TwiML noun such as <VirtualAgent> or <Pay>, Twilio's request to your application will not contain all of the parameters listed above, as they might not all be relevant for the particular status callback. In those instances, you can find the expected parameters in the specific TwiML verb's documentation.

CallStatus values
The following are the possible values for the CallStatus parameter. These values also apply to the DialCallStatus parameter, which is sent with HTTP requests to a <Dial> action URL.

Status	Description
queued	The call is ready and waiting in line before going out.
ringing	The call is currently ringing.
in-progress	The call was answered and is actively in progress.
completed	The call was answered and has ended normally.
busy	The caller received a busy signal.
failed	The call could not be completed as dialed, most likely because the phone number was non-existent.
no-answer	The call ended without being answered.
canceled	The call was canceled via the REST API while queued or ringing.
Ending the call: callback requests


After receiving a call, requesting TwiML from your app, processing it, and finally ending the call, Twilio will make an asynchronous HTTP request to the StatusCallback URL configured for the Twilio number that was called.

You need to explicitly provide this URL to your application in the StatusCallback parameter of each message for which you want the status callbacks. The raw TwiML for this looks like:


Copy code block
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>
        <Number
         statusCallbackEvent="initiated ringing answered completed"
         statusCallback="https://myapp.com/calls/events"
         statusCallbackMethod="POST">
            +12316851234
        </Number>
    </Dial>
</Response>
The code sample below shows how to set your status callback URL with plain TwiML or using the SDK of your choice:

Set a StatusCallback

Node.js

Report code block

Copy code block
const VoiceResponse = require('twilio').twiml.VoiceResponse;


const response = new VoiceResponse();
const dial = response.dial();
dial.number({
    statusCallbackEvent: 'initiated ringing answered completed',
    statusCallback: 'https://myapp.com/calls/events',
    statusCallbackMethod: 'POST'
}, '+12349013030');

console.log(response.toString());
Output

Copy output
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>
        <Number
         statusCallbackEvent="initiated ringing answered completed"
         statusCallback="https://myapp.com/calls/events"
         statusCallbackMethod="POST">
            +12349013030
        </Number>
    </Dial>
</Response>
By providing a StatusCallback URL for your Twilio number and capturing this request, you can determine when a call ends and receive information about the call. Non-relative URLs must contain a valid hostname, and underscores are not permitted.

StatusCallback request parameters
When Twilio sends parameters to your application in an asynchronous request to the StatusCallback URL, they include the same parameters passed in a synchronous TwiML request.

The status callback request also passes these additional parameters:

Parameter	Description
CallDuration	The duration in seconds of the just-completed call.
RecordingUrl	The URL of the phone call's recorded audio. This parameter is included only if Record=true is set on the REST API request, and does not include recordings from <Dial> or <Record>.
RecordingSid	The unique id of the Recording from this call.
RecordingDuration	The duration of the recorded audio (in seconds).
Data formats


Phone numbers
All phone numbers in requests from Twilio are in E.164 format if possible. For example, (231) 685-1234 would come through as '+12316851234'. However, there are occasionally cases where Twilio cannot normalize an incoming caller ID to E.164. In these situations, Twilio will report the raw caller ID string.

Dates and times
All dates and times in requests from Twilio are GMT in RFC 2822
 format. For example, 6:13 PM PDT on August 19th, 2010 would be 'Fri, 20 Aug 2010 01:13:42 +0000'.

Twilio is a well-behaved HTTP client
Twilio behaves just like a web browser when making HTTP requests to URLs:

Cookies: Twilio accepts HTTP cookies and will include them in each request, just like a normal web browser.
Redirects: Twilio follows HTTP Redirects (HTTP status codes 301, 307, etc.), just like a normal web browser. Twilio supports a maximum of 10 redirects before failing the request with error code 11215.
Caching: Twilio will cache files when HTTP headers allow it (via ETag and Last-Modified headers) and when the HTTP method is GET, just like a normal web browser.
Twilio understands MIME types
Twilio does the right thing when your application responds with different MIME types:

MIME Type	Behavior
text/xml, application/xml, text/html	Twilio interprets the returned document as an XML Instruction Set (which we like to call TwiML). This is the most commonly used response.
Various audio types	Twilio plays the audio file to the caller, and then hangs up. See the <Play> documentation for supported MIME types.
text/plain	If the response is valid TwiML, we will execute the provided instructions, otherwise Twilio reads the content of the text out loud to the caller, and then hangs up.
Responding to Twilio


In your response to Twilio's request to your configured URL, you can tell Twilio what to do on a call.

How the TwiML interpreter works


When your application responds to a Twilio request with XML, Twilio runs your document through the TwiML interpreter. The TwiML interpreter only understands the few specially-named XML elements that make up TwiML: <Response> verbs, and nouns.

The interpreter starts at the top of your TwiML document and executes instructions (verbs) in order from top to bottom.

The following code snippet reads "Hello World" to the caller before playing Cowbell.mp3 for the caller and then hanging up.


Copy code block
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Hello, World!</Say>
    <Play>https://api.twilio.com/Cowbell.mp3</Play>
</Response>
Just as with all TwiML, you can use the SDKs to help you play some music to a caller. Include the loop attribute to tell Twilio to loop this recording 10 times (or until the caller hangs up):

Play and loop some music for your callers

Node.js

Report code block

Copy code block
const VoiceResponse = require('twilio').twiml.VoiceResponse;


const response = new VoiceResponse();
response.play({
    loop: 10
}, 'https://api.twilio.com/cowbell.mp3');

console.log(response.toString());
Output

Copy output
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Play loop="10">https://api.twilio.com/cowbell.mp3</Play>
</Response>
Status callbacks in your response


Status callbacks do not control call flow, so TwiML does not need to be returned. If you do respond, use status code 204 No Content or 200 OK with Content-Type: text/xml and an empty <Response/> in the body. Not responding properly will result in warnings in Debugger.

What's next?


Go in-depth to learn more about the various TwiML verbs you'll use with Twilio's Programmable Voice, such as <Dial> to connect a call or <Gather> for speech recognition and collecting user key presses. You'll find all in-depth reference documents linked above.

You may also want to explore how to generate TwiML with Twilio's SDKs, provided to let you generate TwiML in your favorite language.

For a guided walkthrough, check out our server-side Programmable Voice quickstart.