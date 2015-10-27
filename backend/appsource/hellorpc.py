import zerorpc
import sys
import nltk
import logging
import json
from nltk.tag import pos_tag
from nltk.help import upenn_tagset
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk import FreqDist
from rake import Rake
import re

root = logging.getLogger()
root.setLevel(logging.DEBUG)

ch = logging.StreamHandler(sys.stdout)
ch.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
ch.setFormatter(formatter)
root.addHandler(ch)

class HelloRPC(object):
    def hello(self, sentence):

		'''    	
    	tokenized_sentence = word_tokenize(sentence)
	punctuation = re.compile(r'[-.?!,":;()|\]\[\'`0-9]')

	tokenized_sentence = list(filter(None,tokenized_sentence))

	tokenized_sentence = [punctuation.sub("", word) for word in tokenized_sentence]

	extracted = []

	for w in tokenized_sentence:
		if (w.lower() not in stopwords.words('english') and w != ""):
			extracted.append(w)
	
	tagged_sent = pos_tag(extracted)

	interest_types = ["NN","NNP","NNS","VBG","VB"]
	
	for tagged in tagged_sent:
	    word_type = tagged[1]
	    if word_type in interest_types:
	        if (tagged[0] not in extracted and tagged[0] != ""):
	            extracted.append(tagged[0])

	importantwords = ', '.join(extracted)

	fdist = FreqDist(extracted)

	'''
		extracted = []

		rake = Rake("SmartStoplist.txt")

		keywords = rake.run(sentence)

		for keyword in keywords:
			extracted.append(keyword[0])

		importantwords = ', '.join(extracted)

		importantwords = importantwords[:(len(importantwords)/3)]

		return json.dumps([dict(name=keyword[0],weight=keyword[1]) for keyword in keywords])
		
s = zerorpc.Server(HelloRPC())
s.bind("tcp://0.0.0.0:5000")
s.run()
