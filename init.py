import csv
import json
import math

csv_file_path = 'wall.csv'
json_file_path = 'superlast_1.json'

data = []
# total = 923980555180
each = 27

with open(csv_file_path, 'r') as csv_file:
    all_sum=0
    csv_reader = csv.reader(csv_file)
    for row in csv_reader:
        address, sum_value = row
        data.append({
            'address': address,
            'sum': math.floor(float(sum_value) * each)
        })
        all_sum+=float(sum_value)
    print(all_sum)

with open(json_file_path, 'w') as json_file:
    json.dump(data, json_file, indent=4)

print('CSV 文件已成功转换为 JSON 文件。')