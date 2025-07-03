#!/usr/bin/env python3
"""
Apply sample translations to YAML files
This script provides example translations for the new languages
"""
import yaml
from pathlib import Path

# Sample translations for AI literacy domains
SAMPLE_TRANSLATIONS = {
    'zhCN': {
        'overview': {
            'Engaging_with_AI': '涉及使用AI作为工具来访问新内容、信息或推荐。这些情况要求学习者首先识别AI的存在，然后评估AI输出的准确性和相关性。学习者必须对AI的技术基础建立基本理解，以便批判性地分析其能力和局限性。',
            'Creating_with_AI': '涉及与AI工具合作以增强、评估或生成内容或成果。学习者必须理解提示工程，能够提供有效的输入，并批判性地评估AI协助的创作。他们需要平衡自己的创造力与AI的能力，同时保持对自己工作的所有权。',
            'Managing_with_AI': '涉及监督和指导AI系统以确保它们负责任和有效地运行。学习者必须了解数据隐私、算法偏见和AI决策的透明度。他们需要发展技能来监控AI性能并在需要时进行干预。',
            'Designing_with_AI': '涉及塑造AI系统和应用程序以满足特定需求并遵守道德标准。学习者探索如何将公平性、包容性和用户价值观纳入AI设计。他们必须考虑AI技术对个人和社会的更广泛影响。'
        },
        'emoji': {
            'Engaging_with_AI': '🎯',
            'Creating_with_AI': '✨',
            'Managing_with_AI': '⚙️',
            'Designing_with_AI': '🔧'
        },
        'competencies': {
            'E1': {
                'description': '识别AI在不同情境中的角色与影响力。',
                'content': '学习者能识别日常工具与系统中AI的存在，并思考其在各种情境（如内容推荐、适应性学习）中的用途。他们会反思AI如何影响自己的选择、学习与观点。'
            },
            'E2': {
                'description': '评估是否应该接受、修改或拒绝AI的输出。',
                'content': '学习者批判性地评估AI生成内容的准确性和公平性，认识到AI可能产生错误信息或有偏见的输出。他们通过考虑对自己和他人的潜在影响来决定是否信任、修改或否决AI输出。'
            }
        }
    },
    'pt': {
        'overview': {
            'Engaging_with_AI': 'Envolve usar IA como ferramenta para acessar novos conteúdos, informações ou recomendações. Essas situações exigem que os alunos primeiro reconheçam a presença da IA e depois avaliem a precisão e relevância dos resultados da IA. Os alunos devem desenvolver uma compreensão fundamental das bases técnicas da IA para analisar criticamente suas capacidades e limitações.',
            'Creating_with_AI': 'Envolve colaborar com ferramentas de IA para aprimorar, avaliar ou gerar conteúdo ou resultados. Os alunos devem entender a engenharia de prompts, fornecer entradas eficazes e avaliar criticamente as criações assistidas por IA. Eles precisam equilibrar sua própria criatividade com as capacidades da IA, mantendo a propriedade de seu trabalho.',
            'Managing_with_AI': 'Envolve supervisionar e orientar sistemas de IA para garantir que operem de forma responsável e eficaz. Os alunos devem entender sobre privacidade de dados, viés algorítmico e transparência nas decisões da IA. Eles precisam desenvolver habilidades para monitorar o desempenho da IA e intervir quando necessário.',
            'Designing_with_AI': 'Envolve moldar sistemas e aplicações de IA para atender a necessidades específicas e aderir a padrões éticos. Os alunos exploram como incorporar equidade, inclusão e valores do usuário no design da IA. Eles devem considerar as implicações mais amplas das tecnologias de IA para indivíduos e sociedade.'
        },
        'emoji': {
            'Engaging_with_AI': '🎯',
            'Creating_with_AI': '✨',
            'Managing_with_AI': '⚙️',
            'Designing_with_AI': '🔧'
        },
        'competencies': {
            'E1': {
                'description': 'Reconhecer o papel e a influência da IA em diferentes contextos.',
                'content': 'Os alunos identificam a presença da IA em ferramentas e sistemas cotidianos e consideram seu propósito em várias situações, como recomendações de conteúdo ou aprendizagem adaptativa. Eles refletem sobre como a IA influencia suas escolhas, aprendizado e percepções.'
            },
            'E2': {
                'description': 'Avaliar se os resultados da IA devem ser aceitos, revisados ou rejeitados.',
                'content': 'Os alunos avaliam criticamente a precisão e a equidade do conteúdo gerado por IA, reconhecendo que a IA pode gerar desinformação ou resultados tendenciosos. Eles decidem se devem confiar, modificar ou anular os resultados da IA considerando seu impacto potencial em si mesmos e nos outros.'
            }
        }
    },
    'ar': {
        'overview': {
            'Engaging_with_AI': 'يتضمن استخدام الذكاء الاصطناعي كأداة للوصول إلى محتوى أو معلومات أو توصيات جديدة. تتطلب هذه المواقف من المتعلمين أولاً التعرف على وجود الذكاء الاصطناعي، ثم تقييم دقة وملاءمة مخرجات الذكاء الاصطناعي. يجب على المتعلمين تطوير فهم أساسي للأسس التقنية للذكاء الاصطناعي من أجل تحليل قدراته وحدوده بشكل نقدي.',
            'Creating_with_AI': 'يتضمن التعاون مع أدوات الذكاء الاصطناعي لتعزيز أو تقييم أو إنشاء محتوى أو نتائج. يجب على المتعلمين فهم هندسة التلقين، وتقديم مدخلات فعالة، وتقييم الإبداعات المدعومة بالذكاء الاصطناعي بشكل نقدي. يحتاجون إلى موازنة إبداعهم الخاص مع قدرات الذكاء الاصطناعي مع الحفاظ على ملكية عملهم.',
            'Managing_with_AI': 'يتضمن الإشراف على أنظمة الذكاء الاصطناعي وتوجيهها لضمان عملها بشكل مسؤول وفعال. يجب على المتعلمين فهم خصوصية البيانات والتحيز الخوارزمي والشفافية في قرارات الذكاء الاصطناعي. يحتاجون إلى تطوير مهارات لمراقبة أداء الذكاء الاصطناعي والتدخل عند الضرورة.',
            'Designing_with_AI': 'يتضمن تشكيل أنظمة وتطبيقات الذكاء الاصطناعي لتلبية احتياجات محددة والالتزام بالمعايير الأخلاقية. يستكشف المتعلمون كيفية دمج العدالة والشمول وقيم المستخدم في تصميم الذكاء الاصطناعي. يجب عليهم النظر في الآثار الأوسع لتقنيات الذكاء الاصطناعي على الأفراد والمجتمع.'
        },
        'emoji': {
            'Engaging_with_AI': '🎯',
            'Creating_with_AI': '✨',
            'Managing_with_AI': '⚙️',
            'Designing_with_AI': '🔧'
        },
        'competencies': {
            'E1': {
                'description': 'التعرف على دور الذكاء الاصطناعي وتأثيره في سياقات مختلفة.',
                'content': 'يحدد المتعلمون وجود الذكاء الاصطناعي في الأدوات والأنظمة اليومية ويفكرون في غرضه في مواقف مختلفة، مثل توصيات المحتوى أو التعلم التكيفي. يتأملون في كيفية تأثير الذكاء الاصطناعي على خياراتهم وتعلمهم وتصوراتهم.'
            },
            'E2': {
                'description': 'تقييم ما إذا كان ينبغي قبول مخرجات الذكاء الاصطناعي أو مراجعتها أو رفضها.',
                'content': 'يقيم المتعلمون بشكل نقدي دقة وعدالة المحتوى الذي ينشئه الذكاء الاصطناعي، مدركين أن الذكاء الاصطناعي يمكن أن ينتج معلومات خاطئة أو مخرجات متحيزة. يقررون ما إذا كانوا سيثقون في مخرجات الذكاء الاصطناعي أو يعدلونها أو يتجاوزونها من خلال النظر في تأثيرها المحتمل على أنفسهم والآخرين.'
            }
        }
    },
    'id': {
        'overview': {
            'Engaging_with_AI': 'Melibatkan penggunaan AI sebagai alat untuk mengakses konten, informasi, atau rekomendasi baru. Situasi ini mengharuskan peserta didik untuk terlebih dahulu mengenali keberadaan AI, kemudian mengevaluasi akurasi dan relevansi output AI. Peserta didik harus mengembangkan pemahaman fundamental tentang dasar-dasar teknis AI untuk menganalisis kemampuan dan keterbatasannya secara kritis.',
            'Creating_with_AI': 'Melibatkan kolaborasi dengan alat AI untuk meningkatkan, mengevaluasi, atau menghasilkan konten atau hasil. Peserta didik harus memahami rekayasa prompt, memberikan input yang efektif, dan mengevaluasi kreasi yang dibantu AI secara kritis. Mereka perlu menyeimbangkan kreativitas mereka sendiri dengan kemampuan AI sambil mempertahankan kepemilikan atas pekerjaan mereka.',
            'Managing_with_AI': 'Melibatkan pengawasan dan pembimbingan sistem AI untuk memastikan mereka beroperasi secara bertanggung jawab dan efektif. Peserta didik harus memahami privasi data, bias algoritmik, dan transparansi dalam pengambilan keputusan AI. Mereka perlu mengembangkan keterampilan untuk memantau kinerja AI dan melakukan intervensi bila diperlukan.',
            'Designing_with_AI': 'Melibatkan pembentukan sistem dan aplikasi AI untuk memenuhi kebutuhan spesifik dan mematuhi standar etika. Peserta didik mengeksplorasi bagaimana menggabungkan keadilan, inklusi, dan nilai-nilai pengguna ke dalam desain AI. Mereka harus mempertimbangkan implikasi yang lebih luas dari teknologi AI bagi individu dan masyarakat.'
        },
        'emoji': {
            'Engaging_with_AI': '🎯',
            'Creating_with_AI': '✨',
            'Managing_with_AI': '⚙️',
            'Designing_with_AI': '🔧'
        },
        'competencies': {
            'E1': {
                'description': 'Mengenali peran dan pengaruh AI dalam berbagai konteks.',
                'content': 'Peserta didik mengidentifikasi keberadaan AI dalam alat dan sistem sehari-hari dan mempertimbangkan tujuannya dalam berbagai situasi, seperti rekomendasi konten atau pembelajaran adaptif. Mereka merefleksikan bagaimana AI mempengaruhi pilihan, pembelajaran, dan persepsi mereka.'
            },
            'E2': {
                'description': 'Mengevaluasi apakah output AI harus diterima, direvisi, atau ditolak.',
                'content': 'Peserta didik secara kritis menilai akurasi dan keadilan konten yang dihasilkan AI, menyadari bahwa AI dapat menghasilkan informasi yang salah atau output yang bias. Mereka memutuskan apakah akan mempercayai, memodifikasi, atau mengesampingkan output AI dengan mempertimbangkan dampak potensialnya terhadap diri mereka sendiri dan orang lain.'
            }
        }
    },
    'th': {
        'overview': {
            'Engaging_with_AI': 'เกี่ยวข้องกับการใช้ AI เป็นเครื่องมือในการเข้าถึงเนื้อหา ข้อมูล หรือคำแนะนำใหม่ๆ สถานการณ์เหล่านี้ต้องการให้ผู้เรียนรับรู้ถึงการมีอยู่ของ AI ก่อน จากนั้นจึงประเมินความถูกต้องและความเกี่ยวข้องของผลลัพธ์ AI ผู้เรียนต้องพัฒนาความเข้าใจพื้นฐานเกี่ยวกับรากฐานทางเทคนิคของ AI เพื่อวิเคราะห์ความสามารถและข้อจำกัดอย่างมีวิจารณญาณ',
            'Creating_with_AI': 'เกี่ยวข้องกับการทำงานร่วมกับเครื่องมือ AI เพื่อปรับปรุง ประเมิน หรือสร้างเนื้อหาหรือผลลัพธ์ ผู้เรียนต้องเข้าใจวิศวกรรมพรอมต์ ให้อินพุตที่มีประสิทธิภาพ และประเมินการสร้างสรรค์ที่ AI ช่วยเหลืออย่างมีวิจารณญาณ พวกเขาต้องสร้างสมดุลระหว่างความคิดสร้างสรรค์ของตนเองกับความสามารถของ AI ในขณะที่ยังคงความเป็นเจ้าของงานของตน',
            'Managing_with_AI': 'เกี่ยวข้องกับการกำกับดูแลและชี้นำระบบ AI เพื่อให้แน่ใจว่าพวกมันทำงานอย่างมีความรับผิดชอบและมีประสิทธิภาพ ผู้เรียนต้องเข้าใจเกี่ยวกับความเป็นส่วนตัวของข้อมูล อคติของอัลกอริทึม และความโปร่งใสในการตัดสินใจของ AI พวกเขาต้องพัฒนาทักษะในการตรวจสอบประสิทธิภาพของ AI และแทรกแซงเมื่อจำเป็น',
            'Designing_with_AI': 'เกี่ยวข้องกับการกำหนดรูปแบบระบบและแอปพลิเคชัน AI เพื่อตอบสนองความต้องการเฉพาะและปฏิบัติตามมาตรฐานจริยธรรม ผู้เรียนสำรวจวิธีการรวมความยุติธรรม การรวมทุกคน และค่านิยมของผู้ใช้เข้าไปในการออกแบบ AI พวกเขาต้องพิจารณาผลกระทบที่กว้างขึ้นของเทคโนโลยี AI ต่อบุคคลและสังคม'
        },
        'emoji': {
            'Engaging_with_AI': '🎯',
            'Creating_with_AI': '✨',
            'Managing_with_AI': '⚙️',
            'Designing_with_AI': '🔧'
        },
        'competencies': {
            'E1': {
                'description': 'รับรู้บทบาทและอิทธิพลของ AI ในบริบทต่างๆ',
                'content': 'ผู้เรียนระบุการมีอยู่ของ AI ในเครื่องมือและระบบประจำวัน และพิจารณาวัตถุประสงค์ในสถานการณ์ต่างๆ เช่น คำแนะนำเนื้อหาหรือการเรียนรู้แบบปรับตัว พวกเขาสะท้อนถึงวิธีที่ AI มีอิทธิพลต่อทางเลือก การเรียนรู้ และการรับรู้ของพวกเขา'
            },
            'E2': {
                'description': 'ประเมินว่าควรยอมรับ แก้ไข หรือปฏิเสธผลลัพธ์ของ AI หรือไม่',
                'content': 'ผู้เรียนประเมินความถูกต้องและความยุติธรรมของเนื้อหาที่ AI สร้างขึ้นอย่างมีวิจารณญาณ โดยตระหนักว่า AI สามารถสร้างข้อมูลที่ผิดหรือผลลัพธ์ที่มีอคติได้ พวกเขาตัดสินใจว่าจะเชื่อถือ แก้ไข หรือปฏิเสธผลลัพธ์ของ AI โดยพิจารณาผลกระทบที่อาจเกิดขึ้นต่อตนเองและผู้อื่น'
            }
        }
    }
}

def apply_translations(yaml_file: str, language: str):
    """Apply sample translations to a YAML file"""
    # Load YAML
    with open(yaml_file, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
    if language not in SAMPLE_TRANSLATIONS:
        print(f"No sample translations available for {language}")
        return
    
    translations = SAMPLE_TRANSLATIONS[language]
    updated = 0
    
    # Apply domain overviews
    if 'domains' in data:
        for domain_name, domain_data in data['domains'].items():
            # Apply overview
            if domain_name in translations.get('overview', {}) and f'overview_{language}' in domain_data:
                if 'translation needed' in domain_data[f'overview_{language}']:
                    domain_data[f'overview_{language}'] = translations['overview'][domain_name]
                    updated += 1
                    print(f"Updated {domain_name} overview_{language}")
            
            # Apply emoji
            if domain_name in translations.get('emoji', {}) and f'emoji_{language}' in domain_data:
                if 'translation needed' in domain_data[f'emoji_{language}']:
                    domain_data[f'emoji_{language}'] = translations['emoji'][domain_name]
                    updated += 1
                    print(f"Updated {domain_name} emoji_{language}")
            
            # Apply competencies
            if 'competencies' in domain_data:
                for comp_id, comp_data in domain_data['competencies'].items():
                    if comp_id in translations.get('competencies', {}):
                        comp_trans = translations['competencies'][comp_id]
                        
                        # Apply description
                        if 'description' in comp_trans and f'description_{language}' in comp_data:
                            if 'translation needed' in comp_data[f'description_{language}']:
                                comp_data[f'description_{language}'] = comp_trans['description']
                                updated += 1
                                print(f"Updated {domain_name}.{comp_id} description_{language}")
                        
                        # Apply content
                        if 'content' in comp_trans and f'content_{language}' in comp_data:
                            if 'translation needed' in comp_data[f'content_{language}']:
                                comp_data[f'content_{language}'] = comp_trans['content']
                                updated += 1
                                print(f"Updated {domain_name}.{comp_id} content_{language}")
    
    # Save updated file
    if updated > 0:
        with open(yaml_file, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, 
                     default_flow_style=False, 
                     allow_unicode=True,
                     sort_keys=False,
                     width=1000)
        print(f"\nTotal updates: {updated}")
        print(f"Saved to: {yaml_file}")
    else:
        print("No updates made")

def main():
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python apply_sample_translations.py <yaml_file> <language>")
        print("Languages: zhCN, pt, ar, id, th")
        sys.exit(1)
    
    yaml_file = sys.argv[1]
    language = sys.argv[2]
    
    # Handle paths
    if not Path(yaml_file).is_absolute():
        yaml_file = Path('/Users/young/project/ai-square/frontend/public/rubrics_data') / yaml_file
    
    apply_translations(str(yaml_file), language)

if __name__ == "__main__":
    main()