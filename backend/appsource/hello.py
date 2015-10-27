import zerorpc
import sys
import nltk
import logging
from nltk.tag import pos_tag
from nltk.help import upenn_tagset
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk import FreqDist
from rake import Rake
from bs4 import BeautifulSoup
import requests
import re

root = logging.getLogger()
root.setLevel(logging.DEBUG)

ch = logging.StreamHandler(sys.stdout)
ch.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
ch.setFormatter(formatter)
root.addHandler(ch)

sentence="Led Zeppelin were an English rock band formed in London in 1968. Led Zeppelin group consisted of guitarist Jimmy Page, singer Robert Plant, bassist and keyboardist John Paul Jones, and drummer John Bonham. The band's heavy, guitar-driven sound, rooted in blues and psychedelia on their early albums, has earned them recognition as one of the progenitors of heavy metal, though their unique style drew from a wide variety of influences, including folk music."

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
	
# print (importantwords)

fdist = FreqDist(extracted)

# print (fdist)

# print (fdist.most_common(50))

rake = Rake("SmartStoplist.txt")

keywords = rake.run(sentence)

# print (keywords)

for keyword in keywords:
	word = keyword[0]
	# print (word)

response = requests.get('http://en.wikipedia.org/wiki/Led_Zeppelin');

soup = BeautifulSoup(response.text)

content = soup.find(id='mw-content-text')

sentence = ' '.join(content.text.split())

keywords = rake.run(sentence)

print (keywords)

'''
extract = content.find('p')

texts = soup.findAll(text=True)

def visible(element):
    if element.parent.name in ['style', 'script', '[document]', 'head', 'title']:
        return False
    elif re.match('<!--.*-->', str(element.encode('utf8'))):
        return False
    return True

visible_texts = filter(visible, texts)

print (len(keywords))

print (len(keywords)/3)

reallyimp = keywords[:(len(keywords)/3)]

print(len(reallyimp))
'''

