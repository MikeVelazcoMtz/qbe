# -*- coding: utf-8 -*-
import codecs
import csv
from dicttoxml import dicttoxml
from StringIO import StringIO

try:
    from django.utils import simplejson
except:
    import json as simplejson


from django.http import HttpResponse
from django.utils.datastructures import SortedDict

__all__ = ("formats", )


class FormatsException(Exception):
    pass


class Formats(SortedDict):

    def add(self, format):
        parent = self

        def decorator(func):
            if callable(func):
                parent.update({format: func})
            else:
                raise FormatsException("func is not a function.")

        return decorator


formats = Formats()


# Taken from http://docs.python.org/library/csv.html#csv-examples
class UnicodeWriter(object):
    """
    A CSV writer which will write rows to CSV file "f",
    which is encoded in the given encoding.
    """

    def __init__(self, f, dialect=csv.excel_tab, encoding="utf-8", **kwds):
        # Redirect output to a queue
        self.queue = StringIO()
        self.writer = csv.writer(self.queue, dialect=dialect, **kwds)
        self.stream = f
        self.encoder = codecs.getincrementalencoder(encoding)()

    def writerow(self, row):
        self.writer.writerow([unicode(s).encode("utf-8") for s in row])
        # Fetch UTF-8 output from the queue ...
        data = self.queue.getvalue()
        data = data.decode("utf-8")
        # ... and reencode it into the target encoding
        data = self.encoder.encode(data)
        # write to the target stream
        self.stream.write(data)
        # empty queue
        self.queue.truncate(0)

    def writerows(self, rows):
        for row in rows:
            self.writerow(row)


def base_export(labels, results, dialect=csv.excel_tab):
    output = StringIO()
    w = UnicodeWriter(output, dialect=dialect)
    w.writerow(labels)
    for row in results:
        w.writerow(row)
    output.seek(0)
    return output.read()


@formats.add("csv")
def csv_format(labels, results):
    output = base_export(labels, results, dialect=csv.excel)
    mimetype = "text/csv"
    try:
        response = HttpResponse(output, mimetype=mimetype)
    except:
        response = HttpResponse(output, content_type=mimetype)
    return response


@formats.add("ods")
def ods_format(labels, results):
    output = base_export(labels, results)
    mimetype = "application/vnd.oasis.opendocument.spreadsheet"
    try:
        response = HttpResponse(output, mimetype=mimetype)
    except:
        response = HttpResponse(output, content_type=mimetype)
    return response


@formats.add("xls")
def xls_format(labels, results):
    output = base_export(labels, results)
    mimetype = "application/vnd.ms-excel"
    try:
        response = HttpResponse(output, mimetype=mimetype)
    except:
        response = HttpResponse(output, content_type=mimetype)
    return response

@formats.add('xml')
def xml_format(labels, results):
    final = [ dict(zip(labels,item)) for item in results]
    try:
       response = HttpResponse(dicttoxml(final), mimetype='application/text')
    except:
       response = HttpResponse(dicttoxml(final), content_type='application/text')
    return response

@formats.add("json")
def json_format(labels, results):
    final = [ dict(zip(labels,item)) for item in results]
    try:
       response = HttpResponse(dicttoxml(final), mimetype='application/text')
    except:
       response = HttpResponse(dicttoxml(final), content_type='application/text')
    return response
